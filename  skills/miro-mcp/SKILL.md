---
name: miro-mcp-operations
description: Perform generic Miro MCP operations to create or update boards, frames, and visual collaboration artifacts when Miro MCP is available.
---

# Miro MCP Operations

Use this skill when content should be created, updated, or organized in Miro using Miro MCP.

## Goal

1. Create or update content in Miro through Miro MCP.
2. Capture the resulting board or frame URL when content is created or changed.
3. Keep local source artifacts synchronized when the calling workflow requires it.
4. If Miro MCP is unavailable, record an explicit blocker and preserve local source artifacts.

## Preferred Execution Order

1. Miro MCP tool path when available.
2. Calling workflow fallback path using local source artifacts.

## Required Inputs

- Target board or frame context
- Content title or subject
- Source artifact or structured content to place in Miro
- Scope and constraints from the calling workflow

The target Miro board URL and board ID can be read from `project-config.json` at the workspace root:
- Board URL: `miro.boardUrl`
- Board ID: `miro.boardId`

If `project-config.json` is missing, instruct the user to copy `project-config.template.json` and fill in values.

## Content Requirements

- Keep labels concise and collaboration-friendly.
- Preserve important structure from the source artifact.
- Follow any domain-specific rules provided by the calling workflow.

## Validation Steps

1. Confirm Miro MCP connectivity before attempting write operations.
2. Create or update the requested content in Miro.
3. Capture the resulting Miro URL.
4. Update any required tracking artifact specified by the calling workflow.
5. Ensure local source artifacts remain synchronized when required.

## Failure Handling

If Miro publication cannot execute:

1. Keep the calling workflow's local source artifacts current.
2. Record blocker status in the calling workflow's tracking artifact and completion summary.
3. Do not claim Miro publication succeeded.

## Output Requirements

- Return the Miro board/frame link when available.
- Preserve local source-of-truth artifacts as directed by the calling workflow.
- Record status in the calling workflow's tracking artifact when required.
