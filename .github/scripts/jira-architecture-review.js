#!/usr/bin/env node
/**
 * jira-architecture-review.js
 *
 * Creates a Jira "Security Design Review" task in a target project and
 * attaches remote links (Confluence SSD and Miro architecture diagram).
 *
 * Usage:
 *   node .github/scripts/jira-architecture-review.js \
 *     --project <PROJECT_KEY> \
 *     --summary "Security Design Review" \
 *     --confluence-url <url> \
 *     --miro-url <url>
 *
 * Environment variables required:
 *   JIRA_HOST        e.g. https://<tenant>.atlassian.net
 *   JIRA_EMAIL
 *   JIRA_API_TOKEN
 *   JIRA_INSECURE_TLS  (optional) set to 1 to disable TLS verification
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ── Load .env if present ──────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

if (process.env.JIRA_INSECURE_TLS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// ── Load project-config.json if present ───────────────────────────────────────
let projectConfig = {};
const configPath = path.join(process.cwd(), 'project-config.json');
if (fs.existsSync(configPath)) {
  try {
    projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error('Warning: Could not parse project-config.json:', e.message);
  }
}

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : null;
}

const projectKey    = getArg('--project') || (projectConfig.jira && projectConfig.jira.projectKey) || 'MYPROJECT';
const summary       = getArg('--summary') || 'Security Design Review';
const confluenceUrl = getArg('--confluence-url');
const miroUrl       = getArg('--miro-url');
const descriptionArg = getArg('--description') ||
  'Security Solution Design review for the Dental Procedure Cost Estimator (Phase 1 Demo). ' +
  'SSD covers all 10 sections: system overview, scope, architecture summary, data & trust ' +
  'boundaries, security controls, STRIDE threat analysis, OWASP alignment, Zero Trust ' +
  'alignment, and open risks. See remote links for Confluence SSD and Miro architecture diagram.';

// ── Env vars ──────────────────────────────────────────────────────────────────
const { JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error(JSON.stringify({ error: 'Missing JIRA_HOST, JIRA_EMAIL, or JIRA_API_TOKEN' }));
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const baseHeaders = {
  Authorization: `Basic ${auth}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(urlStr, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const options = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method,
      headers: { ...baseHeaders },
    };
    const data = body ? JSON.stringify(body) : null;
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const host = JIRA_HOST.replace(/\/$/, '');

  // 1. Get issue type ID for "Task" in the target project
  const metaRes = await request(
    `${host}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&issuetypeNames=Task&expand=projects.issuetypes`,
    'GET'
  );

  let issueTypeId = null;
  if (metaRes.status === 200) {
    const projects = metaRes.body?.projects || [];
    for (const proj of projects) {
      for (const it of (proj.issuetypes || [])) {
        if (it.name === 'Task') {
          issueTypeId = it.id;
          break;
        }
      }
    }
  }

  if (!issueTypeId) {
    // Fallback: create without explicit issueTypeId (rely on project default Task)
    console.error('Warning: Could not resolve Task issue type ID; using name fallback.');
  }

  // 2. Create the Jira task
  const issuePayload = {
    fields: {
      project: { key: projectKey },
      summary,
      issuetype: issueTypeId ? { id: issueTypeId } : { name: 'Task' },
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: descriptionArg }],
          },
        ],
      },
    },
  };

  const createRes = await request(`${host}/rest/api/3/issue`, 'POST', issuePayload);
  if (createRes.status !== 201) {
    console.error(JSON.stringify({ error: 'Failed to create Jira issue', response: createRes.body }));
    process.exit(1);
  }

  const issueKey = createRes.body.key;
  const issueId  = createRes.body.id;
  const issueUrl = `${host}/browse/${issueKey}`;
  console.error(`Created Jira issue: ${issueKey}`);

  // 3. Add remote links
  const remoteLinks = [];

  if (confluenceUrl) {
    const linkPayload = {
      globalId: `confluence-ssd-${issueKey}`,
      object: {
        url: confluenceUrl,
        title: 'SSD - Dental Procedure Cost Estimator (Confluence)',
        icon: {
          url16x16: 'https://wac-cdn.atlassian.com/assets/img/favicons/confluence/favicon-16x16.png',
          title: 'Confluence',
        },
      },
      relationship: 'Security Solution Design',
    };
    const linkRes = await request(`${host}/rest/api/3/issue/${issueKey}/remotelink`, 'POST', linkPayload);
    if (linkRes.status === 201) {
      remoteLinks.push({ type: 'Confluence SSD', url: confluenceUrl, id: linkRes.body.id });
      console.error(`Added remote link: Confluence SSD`);
    } else {
      console.error('Warning: Confluence remote link failed:', JSON.stringify(linkRes.body));
    }
  }

  if (miroUrl) {
    const miroPayload = {
      globalId: `miro-architecture-${issueKey}`,
      object: {
        url: miroUrl,
        title: 'Architecture Diagram — Miro Board',
        icon: {
          url16x16: 'https://miro.com/favicon.ico',
          title: 'Miro',
        },
      },
      relationship: 'Architecture Diagram',
    };
    const miroRes = await request(`${host}/rest/api/3/issue/${issueKey}/remotelink`, 'POST', miroPayload);
    if (miroRes.status === 201) {
      remoteLinks.push({ type: 'Miro Architecture Diagram', url: miroUrl, id: miroRes.body.id });
      console.error(`Added remote link: Miro Architecture Diagram`);
    } else {
      console.error('Warning: Miro remote link failed:', JSON.stringify(miroRes.body));
    }
  }

  // 4. Output result
  console.log(JSON.stringify({
    issueKey,
    issueId,
    issueUrl,
    summary,
    project: projectKey,
    remoteLinks,
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
