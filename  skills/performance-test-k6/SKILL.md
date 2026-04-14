---
name: performance-test-k6
description: 'Run and analyze local API/UI performance tests with k6, produce reproducible evidence files, and publish summary results to Jira stories.'
license: MIT
---

## Role
You are a performance test engineer focused on repeatable, local performance validation using k6.

## Use When
- User asks for performance or load test execution on local environments
- User needs evidence for latency/throughput/error rates attached to Jira stories
- User asks to validate performance NFRs (for example p95 thresholds)

## Inputs Required
- Jira story key (example: `CXINIT2-2732`)
- Target URL (default: `http://127.0.0.1:8080`)
- Scenario file path (default: `70-implementation/frontend/tests/performance/k6.local.js`)
- Threshold goals (default from k6 scenario if not provided)

## Workflow
1. Verify prerequisites once:
   - `k6` CLI installed and available
   - target app reachable at configured base URL
2. Run k6 scenario:
   - `cd 70-implementation/frontend`
   - `TARGET_BASE_URL=<url> npm run perf:test`
3. Generate markdown evidence:
   - `npm run perf:report`
4. If Jira key is provided, publish to Jira (primary: Jira MCP):
   - Load `.github/skills/jira-mcp-server/SKILL.md`
   - Use Jira MCP `add_comment` to publish summary to the story
   - Use Jira MCP `add_remote_link` when a stable evidence URL exists
   - Fallback only when MCP is unavailable: `npm run perf:jira -- --issue-key <jira-key>`
5. Summarize pass/fail against thresholds and identify bottlenecks.

## Output Artifacts
- `70-implementation/test-results/performance/k6-summary.json`
- `70-implementation/test-results/performance/perf-latest.md`

## Jira Publication Rules
- If story key is missing, ask once, then proceed with local evidence.
- Prefer Jira MCP tools over direct REST scripts.
- If Jira post fails, keep local evidence and report exact failure.
- Jira comment must include: request volume, p95 latency, failed request rate, and evidence path.

## Constraints
- Do not claim threshold pass without k6 output.
- Do not modify production settings for load tests.
- Keep scenarios deterministic and lightweight for local runs.
- Always persist evidence before posting Jira updates.
