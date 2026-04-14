#!/usr/bin/env node
/**
 * jira-approval-review.js
 *
 * Creates or updates Jira approval review issues and maps approval decisions
 * to Jira transitions using project-config.json defaults.
 *
 * Usage:
 *   Create:
 *   node .github/scripts/jira-approval-review.js \
 *     --mode create \
 *     --domain architecture \
 *     --summary "Architecture Leadership Approval - ADD v1.2" \
 *     --artifact "40-architecture/ADD.md" \
 *     --checklist "60-approvals/templates/ARCHITECTURE-REVIEW-CHECKLIST.md" \
 *     --target-env development \
 *     --decision "In Review"
 *
 *   Update existing issue decision/state:
 *   node .github/scripts/jira-approval-review.js \
 *     --mode update \
 *     --issue-key CXINIT2-2740 \
 *     --decision "Approved with conditions" \
 *     --conditions "R4 evidence due" \
 *     --due-date 2026-03-20
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const DECISIONS = new Set([
  'Draft',
  'In Review',
  'Changes Requested',
  'Approved',
  'Approved with conditions',
  'Rejected',
]);

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;

    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function loadProjectConfig() {
  const configPath = path.join(process.cwd(), 'project-config.json');
  if (!fs.existsSync(configPath)) return {};

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
    console.error(JSON.stringify({ error: `Could not parse project-config.json: ${error.message}` }));
    process.exit(1);
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);

  function getArg(name) {
    const idx = args.indexOf(name);
    if (idx < 0) return null;
    return args[idx + 1] || null;
  }

  return {
    mode: (getArg('--mode') || 'create').toLowerCase(),
    domain: (getArg('--domain') || 'architecture').toLowerCase(),
    issueKey: getArg('--issue-key'),
    summary: getArg('--summary'),
    description: getArg('--description'),
    artifact: getArg('--artifact'),
    checklist: getArg('--checklist'),
    decisionLog: getArg('--decision-log') || '60-approvals/records/APPROVAL-DECISIONS.md',
    decision: normalizeDecision(getArg('--decision') || 'In Review'),
    targetEnv: (getArg('--target-env') || 'development').toLowerCase(),
    conditions: getArg('--conditions') || 'None',
    dueDate: getArg('--due-date') || 'N/A',
    reviewerRole: getArg('--reviewer-role') || defaultReviewerRole((getArg('--domain') || 'architecture').toLowerCase()),
    confluenceUrl: getArg('--confluence-url'),
    miroUrl: getArg('--miro-url'),
  };
}

function normalizeDecision(value) {
  if (!value) return 'In Review';
  const text = value.trim().toLowerCase();
  if (text === 'draft') return 'Draft';
  if (text === 'in review' || text === 'in-review') return 'In Review';
  if (text === 'changes requested' || text === 'changes-requested') return 'Changes Requested';
  if (text === 'approved') return 'Approved';
  if (text === 'approved with conditions' || text === 'approved-with-conditions') return 'Approved with conditions';
  if (text === 'rejected') return 'Rejected';
  return value;
}

function defaultReviewerRole(domain) {
  if (domain === 'security') return 'Security Leadership';
  if (domain === 'compliance') return 'Legal or Compliance Leadership';
  return 'Architecture Leadership';
}

function validateInputs(opts) {
  if (!['create', 'update'].includes(opts.mode)) {
    console.error(JSON.stringify({ error: '--mode must be create or update' }));
    process.exit(1);
  }

  if (!['architecture', 'security', 'compliance'].includes(opts.domain)) {
    console.error(JSON.stringify({ error: '--domain must be architecture, security, or compliance' }));
    process.exit(1);
  }

  if (!DECISIONS.has(opts.decision)) {
    console.error(JSON.stringify({ error: '--decision must be one of: Draft, In Review, Changes Requested, Approved, Approved with conditions, Rejected' }));
    process.exit(1);
  }

  if (opts.mode === 'update' && !opts.issueKey) {
    console.error(JSON.stringify({ error: '--issue-key is required for --mode update' }));
    process.exit(1);
  }
}

function makeAdfDescription(lines) {
  return {
    type: 'doc',
    version: 1,
    content: lines.map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

function buildReviewBody(opts, cfg) {
  const projectName = cfg.project?.name || 'Project';
  return [
    `${projectName} ${capitalize(opts.domain)} approval review.`,
    `Decision: ${opts.decision}`,
    `Target environment: ${opts.targetEnv}`,
    `Reviewer role: ${opts.reviewerRole}`,
    `Artifact: ${opts.artifact || 'N/A'}`,
    `Checklist: ${opts.checklist || 'N/A'}`,
    `Decision register: ${opts.decisionLog}`,
    `Conditions: ${opts.conditions || 'None'}`,
    `Condition due date: ${opts.dueDate || 'N/A'}`,
    'This issue is generated by .github/scripts/jira-approval-review.js and mirrors 60-approvals workflow states.',
  ];
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildLabels(opts, cfg) {
  const approvalCfg = cfg.jira?.approvalWorkflow || {};
  const base = Array.isArray(approvalCfg.labels) ? approvalCfg.labels : ['approval-gate'];
  const domainLabel = approvalCfg.domainLabels?.[opts.domain] || `approval-${opts.domain}`;
  return [...new Set([...base, domainLabel])];
}

function getTransitionCandidates(opts, cfg) {
  const fromConfig = cfg.jira?.approvalWorkflow?.transitionByDecision?.[opts.decision];
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;

  const defaults = {
    Draft: ['To Do', 'Open', 'Backlog'],
    'In Review': ['In Review', 'Review'],
    'Changes Requested': ['Changes Requested', 'Rework', 'To Do', 'Open'],
    Approved: ['Done', 'Closed', 'Complete'],
    'Approved with conditions': ['Done', 'Closed', 'Complete'],
    Rejected: ['Rejected', 'Declined', 'Won\'t Do'],
  };

  return defaults[opts.decision] || [];
}

function createRequester(env) {
  const host = env.JIRA_HOST?.replace(/\/$/, '');
  if (!host || !env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
    console.error(JSON.stringify({ error: 'Missing JIRA_HOST, JIRA_EMAIL, or JIRA_API_TOKEN' }));
    process.exit(1);
  }

  const tlsInsecure = String(env.JIRA_TLS_INSECURE || '').trim().toLowerCase() === 'true';
  const caPath = (env.JIRA_CA_CERT_PATH || '').trim();
  let caContent = null;

  if (caPath) {
    try {
      caContent = fs.readFileSync(path.resolve(process.cwd(), caPath));
    } catch (error) {
      console.error(JSON.stringify({
        error: `Could not read JIRA_CA_CERT_PATH file (${caPath}): ${error.message}`,
      }));
      process.exit(1);
    }
  }

  const httpsAgent = new https.Agent({
    rejectUnauthorized: !tlsInsecure,
    ca: caContent || undefined,
  });

  const auth = Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64');

  async function request(pathname, method, body) {
    const url = new URL(`${host}${pathname}`);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      agent: httpsAgent,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed = raw;
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            // Keep raw text when response is not JSON.
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  return { request, host };
}

async function resolveIssueTypeId(request, projectKey, issueTypeName) {
  const encodedProject = encodeURIComponent(projectKey);
  const encodedType = encodeURIComponent(issueTypeName);
  const res = await request(
    `/rest/api/3/issue/createmeta?projectKeys=${encodedProject}&issuetypeNames=${encodedType}&expand=projects.issuetypes`,
    'GET'
  );

  if (res.status !== 200) return null;

  const projects = res.body?.projects || [];
  for (const project of projects) {
    for (const issueType of project.issuetypes || []) {
      if ((issueType.name || '').toLowerCase() === issueTypeName.toLowerCase()) {
        return issueType.id;
      }
    }
  }

  return null;
}

async function createIssue(opts, cfg, api) {
  const projectKey = cfg.jira?.projectKey;
  if (!projectKey) {
    console.error(JSON.stringify({ error: 'Missing jira.projectKey in project-config.json' }));
    process.exit(1);
  }

  const issueTypeName = cfg.jira?.approvalWorkflow?.issueType || cfg.jira?.issueTypeReview || 'Task';
  const issueTypeId = await resolveIssueTypeId(api.request, projectKey, issueTypeName);

  const summary = opts.summary || `${capitalize(opts.domain)} Leadership Approval - ${opts.decision}`;
  const descriptionLines = buildReviewBody(opts, cfg);
  const labels = buildLabels(opts, cfg);

  const payload = {
    fields: {
      project: { key: projectKey },
      summary,
      issuetype: issueTypeId ? { id: issueTypeId } : { name: issueTypeName },
      description: makeAdfDescription(descriptionLines),
      labels,
    },
  };

  const created = await api.request('/rest/api/3/issue', 'POST', payload);
  if (created.status !== 201) {
    console.error(JSON.stringify({ error: 'Failed to create approval issue', response: created.body }));
    process.exit(1);
  }

  return created.body;
}

async function addRemoteLinks(issueKey, opts, api) {
  const links = [];

  const entries = [
    { url: opts.confluenceUrl, title: 'Confluence Approval Artifact', relationship: 'Approval Artifact' },
    { url: opts.miroUrl, title: 'Miro Architecture Diagram', relationship: 'Reference Diagram' },
  ].filter((item) => !!item.url);

  for (const entry of entries) {
    const payload = {
      object: {
        url: entry.url,
        title: entry.title,
      },
      relationship: entry.relationship,
    };

    const res = await api.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/remotelink`, 'POST', payload);
    if (res.status === 201) {
      links.push({ id: res.body.id, url: entry.url, title: entry.title });
    }
  }

  return links;
}

async function updateIssueDescription(issueKey, opts, cfg, api) {
  const lines = buildReviewBody(opts, cfg);
  const payload = {
    fields: {
      description: makeAdfDescription(lines),
    },
  };

  const res = await api.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, 'PUT', payload);
  if (res.status !== 204) {
    console.error(JSON.stringify({ error: 'Failed to update issue description', response: res.body }));
    process.exit(1);
  }
}

async function transitionIssue(issueKey, opts, cfg, api) {
  const transitionCandidates = getTransitionCandidates(opts, cfg);
  if (transitionCandidates.length === 0) {
    return { attempted: [], applied: null, warning: 'No transition candidates configured for decision.' };
  }

  const listRes = await api.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, 'GET');
  if (listRes.status !== 200) {
    return { attempted: transitionCandidates, applied: null, warning: 'Could not fetch available transitions.' };
  }

  const available = listRes.body?.transitions || [];
  const selected = available.find((transition) => {
    return transitionCandidates.some((candidate) => candidate.toLowerCase() === (transition.name || '').toLowerCase());
  });

  if (!selected) {
    return {
      attempted: transitionCandidates,
      applied: null,
      warning: 'No matching transition found in Jira workflow. Issue description still updated.',
    };
  }

  const execRes = await api.request(
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    'POST',
    { transition: { id: selected.id } }
  );

  if (execRes.status !== 204) {
    return {
      attempted: transitionCandidates,
      applied: null,
      warning: 'Matching transition found but transition request failed.',
      response: execRes.body,
    };
  }

  return { attempted: transitionCandidates, applied: selected.name };
}

async function main() {
  loadEnvFile();
  const cfg = loadProjectConfig();
  const opts = parseArgs(process.argv);
  validateInputs(opts);

  const api = createRequester(process.env);

  if (opts.mode === 'create') {
    const issue = await createIssue(opts, cfg, api);
    const remoteLinks = await addRemoteLinks(issue.key, opts, api);
    const transition = await transitionIssue(issue.key, opts, cfg, api);

    console.log(JSON.stringify({
      mode: 'create',
      issueKey: issue.key,
      issueId: issue.id,
      issueUrl: `${api.host}/browse/${issue.key}`,
      decision: opts.decision,
      targetEnvironment: opts.targetEnv,
      remoteLinks,
      transition,
    }, null, 2));
    return;
  }

  await updateIssueDescription(opts.issueKey, opts, cfg, api);
  const transition = await transitionIssue(opts.issueKey, opts, cfg, api);

  console.log(JSON.stringify({
    mode: 'update',
    issueKey: opts.issueKey,
    issueUrl: `${api.host}/browse/${opts.issueKey}`,
    decision: opts.decision,
    targetEnvironment: opts.targetEnv,
    transition,
  }, null, 2));
}

main().catch((error) => {
  if (error && /self-signed certificate|unable to verify the first certificate|certificate/i.test(error.message || '')) {
    console.error(JSON.stringify({
      error: error.message,
      hint: 'Configure JIRA_CA_CERT_PATH in .env to your corporate root/intermediate CA PEM file. For temporary local troubleshooting only, set JIRA_TLS_INSECURE=true.',
    }));
    process.exit(1);
  }

  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
});
