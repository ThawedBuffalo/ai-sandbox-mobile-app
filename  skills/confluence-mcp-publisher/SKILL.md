---
name: confluence-mcp-publisher
description: Publish Architecture Design Document (ADD) content to Confluence using Atlassian APIs (or Confluence MCP when available), with local ADD.md retained as backup.
---

# Confluence MCP Publisher

Use this skill when you need to publish or update architecture documents in Confluence as the primary output.

## Goal

1. Publish ADD content to Confluence first.
2. Keep local `40-architecture/ADD.md` as a backup mirror.
3. Report publish URL and page ID.
4. If publish fails, record an explicit blocker and keep local backup current.

## Preferred Execution Order

1. Confluence MCP tool path (if available in the environment).
2. Repository script fallback path:
   - `.github/scripts/publish-confluence-add.py`

## Required Inputs

- Confluence page title
- Confluence space key
- Confluence parent page ID
- Markdown source file path (for ADD backup copy)

These values can be read from `project-config.json` at the workspace root:
- Space key: `confluence.spaceKey`
- Parent page ID: `confluence.parentPageId`
- Parent page URL: `confluence.parentPageUrl`

If `project-config.json` is missing, instruct the user to copy `project-config.template.json` and fill in values.

## Required Environment Variables (script fallback)

- `JIRA_HOST` (Atlassian host, e.g. `https://<tenant>.atlassian.net`)
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`

## Publish Command (script fallback)

```bash
python3 .github/scripts/publish-confluence-add.py \
  --title "<ADD page title>" \
  --space-key "<SPACE_KEY>" \
  --parent-id "<PARENT_PAGE_ID>" \
  --md-path "40-architecture/ADD.md"
```

## Validation Steps

1. Confirm env vars are present (do not print secret values).
2. Run publish command and capture JSON result.
3. Confirm output includes `pageId` and `url`.
4. Update `40-architecture/architecture-links.md` with:
   - Confluence page URL
   - Confluence page ID
   - Publish method (`POST`/`PUT`)

## Failure Handling

If publish cannot execute:

1. Keep local `40-architecture/ADD.md` as backup.
2. Record blocker in `40-architecture/architecture-links.md` and completion summary.
3. Do not claim Confluence publication succeeded.

## Output Requirements

- ADD content remains Jira-free.
- Jira references, if needed, stay in `40-architecture/architecture-links.md` only.
