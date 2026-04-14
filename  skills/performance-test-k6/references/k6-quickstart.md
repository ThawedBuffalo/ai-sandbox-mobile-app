# k6 Quickstart (Local)

## Prerequisites
- k6 CLI installed
- Local target app running and reachable

## Commands
```bash
cd 70-implementation/frontend
TARGET_BASE_URL=http://127.0.0.1:8080 npm run perf:test
npm run perf:report
npm run perf:jira -- --issue-key CXINIT2-2732
```

## Artifacts
- 70-implementation/test-results/performance/k6-summary.json
- 70-implementation/test-results/performance/perf-latest.md
