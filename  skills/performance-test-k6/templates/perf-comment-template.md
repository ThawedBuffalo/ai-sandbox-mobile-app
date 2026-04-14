# Jira Performance Comment Template

Performance test execution summary
- Story: <jira-key>
- Command: TARGET_BASE_URL=<url> npm run perf:test && npm run perf:report
- Requests: <requests>
- p95 latency (ms): <p95>
- Failed request rate: <failed-rate>
- Evidence: 70-implementation/test-results/performance/perf-latest.md
- Threshold result: <pass|fail>
