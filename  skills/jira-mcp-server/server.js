#!/usr/bin/env node
/**
 * DevConn local Jira MCP server.
 * Tools: list_projects, get_issue, search_issues, create_issue,
 *        add_remote_link, get_issue_transitions, transition_issue, add_comment
 *
 * Credentials loaded from .env in the workspace root.
 * Handles corporate TLS interception via NODE_TLS_REJECT_UNAUTHORIZED=0 in .env.
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadDotEnv() {
  // Look for .env in the workspace root (3 levels up from .github/skills/jira-mcp-server/)
  const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
  const envPath = path.join(workspaceRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const idx = s.indexOf('=');
    const key = s.slice(0, idx).trim();
    let val = s.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotEnv();

const JIRA_HOST = (process.env.JIRA_HOST || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const INSECURE_TLS = process.env.JIRA_INSECURE_TLS === '1' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  process.stderr.write('ERROR: JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN must be set in .env\n');
  process.exit(1);
}

const AUTH_HEADER = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const TLS_AGENT = INSECURE_TLS ? new https.Agent({ rejectUnauthorized: false }) : undefined;

// ── HTTP helper ───────────────────────────────────────────────────────────────
function jiraRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: AUTH_HEADER,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
      ...(TLS_AGENT ? { agent: TLS_AGENT } : {}),
    };
    const req = https.request(new URL(urlPath, JIRA_HOST), options, (res) => {
      let raw = '';
      res.on('data', (d) => (raw += d));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`Jira ${method} ${urlPath} → ${res.statusCode}: ${raw.slice(0, 500)}`));
        }
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          resolve({ raw });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── ADF helper ────────────────────────────────────────────────────────────────
function toAdf(text) {
  const content = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('- ')) {
      const last = content[content.length - 1];
      if (!last || last.type !== 'bulletList') content.push({ type: 'bulletList', content: [] });
      content[content.length - 1].content.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: line.slice(2) }] }],
      });
    } else {
      content.push({ type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [] });
    }
  }
  return { type: 'doc', version: 1, content };
}

// ── MCP server ────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: 'devconn-jira-mcp',
  version: '1.0.0',
});

// list_projects
server.tool('list_projects', 'List all accessible Jira projects', {}, async () => {
  const data = await jiraRequest('GET', '/rest/api/3/project');
  const lines = (Array.isArray(data) ? data : []).map((p) => `${p.key}  ${p.name}`).join('\n');
  return { content: [{ type: 'text', text: lines || 'No projects found.' }] };
});

// get_issue
server.tool('get_issue', 'Get a Jira issue by key', { issueKey: z.string().describe('Issue key e.g. PROJ-123') }, async ({ issueKey }) => {
  const data = await jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(issueKey)}`);
  const f = data.fields || {};
  const desc = f.description ? JSON.stringify(f.description).slice(0, 300) : 'none';
  return {
    content: [{
      type: 'text',
      text: `Key: ${data.key}\nSummary: ${f.summary}\nStatus: ${f.status?.name}\nDescription (truncated): ${desc}`,
    }],
  };
});

// search_issues
server.tool(
  'search_issues',
  'Search Jira issues with JQL',
  {
    jql: z.string().describe('JQL query string'),
    maxResults: z.number().optional().default(20).describe('Max results to return'),
  },
  async ({ jql, maxResults }) => {
    const data = await jiraRequest('POST', '/rest/api/3/issue/search', { jql, maxResults, fields: ['summary', 'status', 'issuetype'] });
    const lines = (data.issues || []).map((i) => `${i.key}  [${i.fields?.issuetype?.name}]  ${i.fields?.summary}  (${i.fields?.status?.name})`).join('\n');
    return { content: [{ type: 'text', text: lines || 'No issues found.' }] };
  }
);

// create_issue
server.tool(
  'create_issue',
  'Create a new Jira issue',
  {
    projectKey: z.string().describe('Jira project key e.g. PROJ'),
    summary: z.string().describe('Issue summary / title'),
    issueType: z.string().default('Task').describe('Issue type name e.g. Task, Story, Bug'),
    description: z.string().optional().describe('Plain-text description (converted to ADF)'),
    labels: z.array(z.string()).optional().describe('Labels to apply'),
  },
  async ({ projectKey, summary, issueType, description, labels }) => {
    const fields = {
      project: { key: projectKey },
      summary,
      issuetype: { name: issueType },
      ...(description ? { description: toAdf(description) } : {}),
      ...(labels?.length ? { labels } : {}),
    };
    const data = await jiraRequest('POST', '/rest/api/3/issue', { fields });
    return {
      content: [{
        type: 'text',
        text: `Created: ${data.key}\nURL: ${JIRA_HOST}/browse/${data.key}`,
      }],
    };
  }
);

// add_remote_link
server.tool(
  'add_remote_link',
  'Add a remote link (URL) to a Jira issue',
  {
    issueKey: z.string().describe('Issue key e.g. PROJ-123'),
    url: z.string().url().describe('URL to link'),
    title: z.string().describe('Display title for the link'),
  },
  async ({ issueKey, url, title }) => {
    await jiraRequest('POST', `/rest/api/3/issue/${encodeURIComponent(issueKey)}/remotelink`, {
      object: { url, title },
    });
    return { content: [{ type: 'text', text: `Remote link added to ${issueKey}: ${title} → ${url}` }] };
  }
);

// get_issue_transitions
server.tool(
  'get_issue_transitions',
  'Get available workflow transitions for a Jira issue',
  { issueKey: z.string().describe('Issue key') },
  async ({ issueKey }) => {
    const data = await jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`);
    const lines = (data.transitions || []).map((t) => `id=${t.id}  name=${t.name}`).join('\n');
    return { content: [{ type: 'text', text: lines || 'No transitions available.' }] };
  }
);

// transition_issue
server.tool(
  'transition_issue',
  'Transition a Jira issue to a new workflow status',
  {
    issueKey: z.string().describe('Issue key'),
    transitionId: z.string().describe('Transition ID from get_issue_transitions'),
  },
  async ({ issueKey, transitionId }) => {
    await jiraRequest('POST', `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
      transition: { id: transitionId },
    });
    return { content: [{ type: 'text', text: `Issue ${issueKey} transitioned (id=${transitionId}).` }] };
  }
);

// add_comment
server.tool(
  'add_comment',
  'Add a comment to a Jira issue',
  {
    issueKey: z.string().describe('Issue key'),
    comment: z.string().describe('Comment text (plain text, converted to ADF)'),
  },
  async ({ issueKey, comment }) => {
    await jiraRequest('POST', `/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      body: toAdf(comment),
    });
    return { content: [{ type: 'text', text: `Comment added to ${issueKey}.` }] };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('devconn-jira-mcp server running\n');
})();
