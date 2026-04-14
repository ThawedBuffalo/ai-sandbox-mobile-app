const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

function loadDotEnv() {
  const dotEnvPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(dotEnvPath)) {
    return;
  }

  const lines = fs.readFileSync(dotEnvPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function fail(message, details) {
  const payload = { error: message };
  if (details !== undefined) {
    payload.details = details;
  }
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    fail(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function normalizeHost(host) {
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    return `https://${host}`;
  }
  return host.replace(/\/$/, '');
}

function toAdf(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    };
  }

  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map((paragraph) => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: paragraph,
        },
      ],
    }));

  return {
    type: 'doc',
    version: 1,
    content: paragraphs.length ? paragraphs : [{ type: 'paragraph', content: [] }],
  };
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function readSpec(specPath) {
  const absolutePath = path.resolve(specPath);
  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail('Unable to read or parse spec file', { path: absolutePath, message: error.message });
  }

  if (!parsed.projectKey) {
    fail('Spec file must include projectKey');
  }
  if (!parsed.epic || !parsed.epic.summary) {
    fail('Spec file must include epic.summary');
  }
  if (!parsed.prdPath) {
    fail('Spec file must include prdPath so story tracking can be linked to a PRD');
  }

  return parsed;
}

function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function normalizePrdPath(prdPath) {
  const absolute = path.resolve(process.cwd(), prdPath);
  return path.relative(process.cwd(), absolute).replace(/\\/g, '/');
}

function trackerPath() {
  return path.resolve(
    process.cwd(),
    '.github/skills/jira-backlog-generation/state/story-tracker.json',
  );
}

function loadTracker() {
  const filePath = trackerPath();
  if (!fs.existsSync(filePath)) {
    return { version: 1, records: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || !Array.isArray(parsed.records)) {
      return { version: 1, records: [] };
    }
    return parsed;
  } catch {
    return { version: 1, records: [] };
  }
}

function saveTracker(state) {
  const filePath = trackerPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function getOrCreateRecord(state, { projectKey, prdPath, specPath }) {
  const normalizedPrdPath = normalizePrdPath(prdPath);
  let record = state.records.find(
    (entry) => entry.projectKey === projectKey && entry.prdPath === normalizedPrdPath,
  );

  if (!record) {
    record = {
      projectKey,
      prdPath: normalizedPrdPath,
      specPath: path.relative(process.cwd(), path.resolve(specPath)).replace(/\\/g, '/'),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      epic: null,
      stories: [],
      nfrTasks: [],
    };
    state.records.push(record);
  }

  return record;
}

function itemFingerprint(item, issueTypeName) {
  return sha1(
    JSON.stringify({
      summary: item.summary,
      description: item.description || '',
      issueType: issueTypeName,
    }),
  );
}

function mergePlannedItems(existingItems, incomingItems, fallbackIssueType) {
  const merged = [...(existingItems || [])];

  for (const item of incomingItems || []) {
    const issueTypeName = item.issueType || fallbackIssueType;
    const fingerprint = itemFingerprint(item, issueTypeName);
    const existing = merged.find(
      (entry) => entry.summary === item.summary && entry.issueType === issueTypeName,
    );

    if (!existing) {
      merged.push({
        summary: item.summary,
        issueType: issueTypeName,
        description: item.description || '',
        labels: item.labels || [],
        descriptionHash: fingerprint,
        status: 'pending',
        key: null,
        createdAt: null,
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    existing.descriptionHash = fingerprint;
    existing.description = item.description || existing.description || '';
    existing.labels = item.labels || existing.labels || [];
    existing.updatedAt = new Date().toISOString();
  }

  return merged;
}

function shouldCreateByInput(item, runOptions, collectionKey) {
  const allowList = runOptions?.[collectionKey];
  if (!Array.isArray(allowList) || allowList.length === 0) {
    return true;
  }
  return allowList.includes(item.summary);
}

function jiraRequest({ host, authHeader, method, requestPath, body }) {
  const url = new URL(requestPath, host);
  const options = {
    method,
    rejectUnauthorized: !isTruthy(process.env.JIRA_ALLOW_SELF_SIGNED),
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
  };

  let payload;
  if (body !== undefined) {
    payload = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        let parsedBody = responseBody;
        try {
          parsedBody = responseBody ? JSON.parse(responseBody) : {};
        } catch {
          // Leave as raw text when Jira does not return JSON.
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject({
            statusCode: res.statusCode,
            body: parsedBody,
            method,
            requestPath,
          });
          return;
        }

        resolve(parsedBody);
      });
    });

    req.on('error', (error) => reject({ message: error.message, method, requestPath }));

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function getCreateMeta(context, projectKey, issueTypeName) {
  const query = `/rest/api/3/issue/createmeta?projectKeys=${encodeURIComponent(projectKey)}&issuetypeNames=${encodeURIComponent(issueTypeName)}&expand=projects.issuetypes.fields`;
  const response = await jiraRequest({
    host: context.host,
    authHeader: context.authHeader,
    method: 'GET',
    requestPath: query,
  });

  const project = response.projects && response.projects[0];
  const issueType = project && project.issuetypes && project.issuetypes[0];
  if (!issueType) {
    fail('Unable to load create metadata for issue type', { projectKey, issueTypeName, response });
  }
  return issueType;
}

function findFieldKeyByName(fields, targetName) {
  return Object.entries(fields || {}).find(([, value]) => value && value.name === targetName)?.[0];
}

async function validateProjectAccess(context, projectKey) {
  return jiraRequest({
    host: context.host,
    authHeader: context.authHeader,
    method: 'GET',
    requestPath: `/rest/api/3/project/${encodeURIComponent(projectKey)}`,
  });
}

async function createIssue(context, fields) {
  const response = await jiraRequest({
    host: context.host,
    authHeader: context.authHeader,
    method: 'POST',
    requestPath: '/rest/api/3/issue',
    body: { fields },
  });
  return response;
}

function escapeJqlText(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function findExistingIssueKey(context, { projectKey, issueTypeName, summary, labels }) {
  const jqlParts = [
    `project = "${escapeJqlText(projectKey)}"`,
    `issuetype = "${escapeJqlText(issueTypeName)}"`,
    `summary ~ "\\\"${escapeJqlText(summary)}\\\""`,
  ];

  if (Array.isArray(labels) && labels.length > 0) {
    jqlParts.push(`labels = "${escapeJqlText(labels[0])}"`);
  }

  const params = new URLSearchParams({
    jql: jqlParts.join(' AND '),
    maxResults: '1',
    fields: 'summary',
  });

  const response = await jiraRequest({
    host: context.host,
    authHeader: context.authHeader,
    method: 'GET',
    requestPath: `/rest/api/3/search/jql?${params.toString()}`,
  });

  if (!response.issues || response.issues.length === 0) {
    return null;
  }

  return response.issues[0].key || null;
}

function buildBaseFields(projectKey, issueTypeName, item, sharedLabels) {
  const fields = {
    project: { key: projectKey },
    summary: item.summary,
    issuetype: { name: issueTypeName },
    description: toAdf(item.description || ''),
  };

  const labels = uniqueStrings([...(sharedLabels || []), ...(item.labels || [])]);
  if (labels.length) {
    fields.labels = labels;
  }

  return fields;
}

async function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    fail('Usage: node create-jira-issues.js <spec-file.json>');
  }

  loadDotEnv();

  const host = normalizeHost(requireEnv('JIRA_HOST'));
  const email = requireEnv('JIRA_EMAIL');
  const token = requireEnv('JIRA_API_TOKEN');
  const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
  const context = { host, authHeader };

  const spec = readSpec(specPath);
  const projectKey = spec.projectKey;
  const sharedLabels = spec.labels || [];
  const runOptions = spec.run || {};

  const trackerState = loadTracker();
  const record = getOrCreateRecord(trackerState, {
    projectKey,
    prdPath: spec.prdPath,
    specPath,
  });

  record.stories = mergePlannedItems(record.stories, spec.stories || [], 'Story');
  record.nfrTasks = mergePlannedItems(record.nfrTasks, spec.nfrTasks || [], 'Task');
  record.lastUpdated = new Date().toISOString();
  saveTracker(trackerState);

  await validateProjectAccess(context, projectKey);

  const epicSpec = spec.epic;
  const epicIssueTypeName = epicSpec.issueType || 'Feature';
  let epicKey = record.epic && record.epic.key;

  if (!runOptions.dryRun && record.epic) {
    const isDryRunEpic =
      record.epic.status === 'dry-run' ||
      String(record.epic.key || '').startsWith('DRYRUN-');
    if (isDryRunEpic) {
      epicKey = null;
    }
  }

  if (!epicKey) {
    const existingEpicKey = await findExistingIssueKey(context, {
      projectKey,
      issueTypeName: epicIssueTypeName,
      summary: epicSpec.summary,
      labels: uniqueStrings([...(sharedLabels || []), ...(epicSpec.labels || [])]),
    });

    if (existingEpicKey) {
      epicKey = existingEpicKey;
      record.epic = {
        key: epicKey,
        summary: epicSpec.summary,
        issueType: epicIssueTypeName,
        status: 'created',
        createdAt: new Date().toISOString(),
      };
      record.lastUpdated = new Date().toISOString();
      saveTracker(trackerState);
    }
  }

  if (!epicKey) {
    const epicMeta = await getCreateMeta(context, projectKey, epicIssueTypeName);
    const epicNameFieldKey = findFieldKeyByName(epicMeta.fields, 'Epic Name');
    const epicFields = buildBaseFields(projectKey, epicIssueTypeName, epicSpec, sharedLabels);

    if (epicNameFieldKey) {
      epicFields[epicNameFieldKey] = epicSpec.epicName || epicSpec.summary;
    }

    if (!runOptions.dryRun) {
      const epicResult = await createIssue(context, epicFields);
      epicKey = epicResult.key;
    } else {
      epicKey = 'DRYRUN-EPIC';
    }

    record.epic = {
      key: epicKey,
      summary: epicSpec.summary,
      issueType: epicIssueTypeName,
      status: runOptions.dryRun ? 'dry-run' : 'created',
      createdAt: new Date().toISOString(),
    };
    record.lastUpdated = new Date().toISOString();
    saveTracker(trackerState);
  }

  async function createChildren(trackedItems, collectionKey) {
    const created = [];
    const skipped = [];

    for (const item of trackedItems || []) {
      if (item.status === 'created' && item.key) {
        skipped.push({ summary: item.summary, reason: 'already-created', key: item.key });
        continue;
      }

      if (!shouldCreateByInput(item, runOptions, collectionKey)) {
        skipped.push({ summary: item.summary, reason: 'not-selected' });
        continue;
      }

      const issueTypeName = item.issueType;
      const meta = await getCreateMeta(context, projectKey, issueTypeName);
      const fields = buildBaseFields(projectKey, issueTypeName, item, sharedLabels);
      const epicLinkFieldKey = findFieldKeyByName(meta.fields, 'Epic Link');

      if (epicLinkFieldKey) {
        fields[epicLinkFieldKey] = epicKey;
      } else if (meta.fields && meta.fields.parent) {
        fields.parent = { key: epicKey };
      } else {
        fail('Unable to determine how to link child issue to epic', {
          projectKey,
          issueTypeName,
        });
      }

      const existingKey = await findExistingIssueKey(context, {
        projectKey,
        issueTypeName,
        summary: item.summary,
        labels: uniqueStrings([...(sharedLabels || []), ...(item.labels || [])]),
      });

      if (existingKey) {
        item.key = existingKey;
        item.status = 'created';
        item.createdAt = item.createdAt || new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        record.lastUpdated = new Date().toISOString();
        saveTracker(trackerState);
        skipped.push({ summary: item.summary, reason: 'already-exists-in-jira', key: existingKey });
        continue;
      }

      if (!runOptions.dryRun) {
        const result = await createIssue(context, fields);
        item.key = result.key;
      } else {
        item.key = `DRYRUN-${issueTypeName.toUpperCase()}`;
      }

      item.status = runOptions.dryRun ? 'dry-run' : 'created';
      item.createdAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
      record.lastUpdated = new Date().toISOString();
      saveTracker(trackerState);

      created.push({ key: item.key, summary: item.summary, issueType: issueTypeName });
    }

    return { created, skipped };
  }

  const stories = await createChildren(record.stories || [], 'storySummariesToCreate');
  const nfrTasks = await createChildren(record.nfrTasks || [], 'nfrSummariesToCreate');

  const pendingStories = (record.stories || []).filter((item) => item.status !== 'created').length;
  const pendingNfrTasks = (record.nfrTasks || []).filter((item) => item.status !== 'created').length;

  process.stdout.write(
    `${JSON.stringify(
      {
        projectKey,
        prdPath: record.prdPath,
        trackerFile: path
          .relative(process.cwd(), trackerPath())
          .replace(/\\/g, '/'),
        epic: { key: epicKey, summary: epicSpec.summary, issueType: epicIssueTypeName },
        stories: stories.created,
        nfrTasks: nfrTasks.created,
        skipped: {
          stories: stories.skipped,
          nfrTasks: nfrTasks.skipped,
        },
        pending: {
          stories: pendingStories,
          nfrTasks: pendingNfrTasks,
        },
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  fail('Jira issue creation failed', error);
});