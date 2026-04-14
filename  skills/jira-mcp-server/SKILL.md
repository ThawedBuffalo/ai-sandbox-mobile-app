---
name: jira-mcp-server
description: >
  Local Jira MCP server providing Jira Cloud operations (list projects, get/create/search issues,
  transitions, comments, remote links) over the Model Context Protocol stdio transport.
---

# Jira MCP Server

Local MCP server that exposes Jira Cloud REST API operations as MCP tools for use by VS Code agents.

## Tools Provided

| Tool | Description |
|---|---|
| `list_projects` | List all accessible Jira projects |
| `get_issue` | Get a Jira issue by key |
| `search_issues` | Search issues with JQL |
| `create_issue` | Create a new issue (Task, Story, Bug, Epic) |
| `add_remote_link` | Attach an external URL to an issue |
| `get_issue_transitions` | List available workflow transitions |
| `transition_issue` | Move an issue to a new status |
| `add_comment` | Add a comment to an issue |

## Setup

### 1. Install dependencies

```bash
cd .github/skills/jira-mcp-server && npm install
```

### 2. Configure credentials

Credentials are read from `.env` in the **workspace root** (not this directory):

```bash
cp .env.template .env
# fill in JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN
```

### 3. MCP registration

The server is registered in `.vscode/mcp.json` and starts automatically when VS Code invokes it.

To run manually:

```bash
node .github/skills/jira-mcp-server/server.js
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JIRA_HOST` | Yes | Atlassian instance URL (e.g. `https://<tenant>.atlassian.net`) |
| `JIRA_EMAIL` | Yes | Jira user email for API auth |
| `JIRA_API_TOKEN` | Yes | Jira API token |
| `JIRA_INSECURE_TLS` | No | Set to `1` to disable TLS verification (corporate proxies) |

## Files

- `server.js` — MCP server entrypoint
- `package.json` — Node.js dependencies (`@modelcontextprotocol/sdk`, `zod`)
