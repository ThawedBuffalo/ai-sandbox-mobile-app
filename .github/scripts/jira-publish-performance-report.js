#!/usr/bin/env node
'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');
const { URL } = require('url');

function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (name, fallback = null) => {
    const idx = args.indexOf(name);
    if (idx === -1) return fallback;
    return args[idx + 1] || fallback;
  };

  return {
    issueKey: get('--issue-key', process.env.ISSUE_KEY || null),
    reportFile: get('--report-file', process.env.PERF_REPORT_FILE || null),
    reportPathForDisplay: get('--report-path', process.env.PERF_REPORT_PATH || null),
  };
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const rows = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const row of rows) {
    const line = row.trim();
    if (!line || line.startsWith('#')) continue;

    const idx = line.indexOf('=');
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function createRequester() {
  const host = (process.env.JIRA_HOST || '').replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL || '';
  const token = process.env.JIRA_API_TOKEN || '';

  if (!host || !email || !token) {
    throw new Error('Missing JIRA_HOST, JIRA_EMAIL, or JIRA_API_TOKEN');
  }

  const tlsInsecure = String(process.env.JIRA_TLS_INSECURE || '').toLowerCase() === 'true';
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const httpsAgent = new https.Agent({ rejectUnauthorized: !tlsInsecure });

  async function request(pathname, method, body) {
    const url = new URL(`${host}${pathname}`);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: `${url.pathname}${url.search}`,
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
            // keep raw
          }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  return { request, host };
}

function toAdfParagraph(text) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

function parseSummary(reportContent) {
  const lines = reportContent.split('\n');
  const picks = [];
  for (const line of lines) {
    if (
      line.startsWith('- Iterations completed:') ||
      line.startsWith('- HTTP requests:') ||
      line.startsWith('- Max virtual users:') ||
      line.startsWith('- HTTP failed request rate:') ||
      line.startsWith('- p95:')
    ) {
      picks.push(line.replace(/^-\s*/, '').trim());
    }
  }
  return picks;
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv);

  if (!args.issueKey) {
    throw new Error('Missing --issue-key (or ISSUE_KEY env var)');
  }

  if (!args.reportFile) {
    throw new Error('Missing --report-file (or PERF_REPORT_FILE env var)');
  }

  const reportFileAbs = path.resolve(process.cwd(), args.reportFile);
  if (!fs.existsSync(reportFileAbs)) {
    throw new Error(`Report file not found: ${reportFileAbs}`);
  }

  const reportContent = fs.readFileSync(reportFileAbs, 'utf-8');
  const summary = parseSummary(reportContent);
  const displayPath = args.reportPathForDisplay || args.reportFile;

  const lines = [
    'Performance test execution summary',
    ...summary,
    `Evidence file: ${displayPath}`,
  ];

  const body = {
    body: {
      type: 'doc',
      version: 1,
      content: lines.map(toAdfParagraph),
    },
  };

  const { request } = createRequester();
  const response = await request(`/rest/api/3/issue/${encodeURIComponent(args.issueKey)}/comment`, 'POST', body);

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Jira comment failed (${response.status}): ${JSON.stringify(response.body)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    issueKey: args.issueKey,
    reportFile: args.reportFile,
    jiraStatus: response.status,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
});
