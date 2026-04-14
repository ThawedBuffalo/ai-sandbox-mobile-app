#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (name, fallback = null) => {
    const idx = args.indexOf(name);
    if (idx === -1) return fallback;
    return args[idx + 1] || fallback;
  };

  return {
    jsonFile: get('--json-file'),
    outputFile: get('--output-file'),
    jiraKey: get('--jira-key', 'UNSPECIFIED'),
    command: get('--command', 'npm run perf:test && npm run perf:report && npm run perf:summary'),
  };
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function renderMarkdown(payload, args) {
  const metrics = payload.metrics || {};
  const checks = metrics.checks?.values || {};
  const httpReqDuration = metrics.http_req_duration?.values || {};
  const iterations = metrics.iterations?.values || {};
  const httpReqFailed = metrics.http_req_failed?.values || {};

  const p95 = httpReqDuration['p(95)'] ?? 'N/A';
  const p99 = httpReqDuration['p(99)'] ?? 'N/A';
  const median = httpReqDuration.med ?? 'N/A';
  const min = httpReqDuration.min ?? 'N/A';
  const max = httpReqDuration.max ?? 'N/A';
  const mean = httpReqDuration.avg ?? 'N/A';
  const completed = iterations.count ?? 'N/A';
  const reqTotal = metrics.http_reqs?.values?.count ?? 'N/A';
  const vusMax = metrics.vus_max?.values?.value ?? 'N/A';
  const checkPasses = checks.passes ?? 'N/A';
  const checkFails = checks.fails ?? 'N/A';
  const httpFailedRate = httpReqFailed.rate ?? 'N/A';
  const generatedAt = new Date().toISOString();

  return [
    '# Performance Test Evidence',
    '',
    `- Jira story: ${args.jiraKey}`,
    `- Generated at (UTC): ${generatedAt}`,
    `- Command: ${args.command}`,
    `- Source JSON: ${args.jsonFile}`,
    '',
    '## Summary',
    '',
    `- Iterations completed: ${completed}`,
    `- HTTP requests: ${reqTotal}`,
    `- Max virtual users: ${vusMax}`,
    `- Check passes: ${checkPasses}`,
    `- Check fails: ${checkFails}`,
    `- HTTP failed request rate: ${httpFailedRate}`,
    '',
    '## HTTP Request Duration (ms)',
    '',
    `- min: ${min}`,
    `- median: ${median}`,
    `- p95: ${p95}`,
    `- p99: ${p99}`,
    `- max: ${max}`,
    `- mean: ${mean}`,
    '',
    '## Throughput',
    '',
    `- iterations/sec: ${iterations.rate ?? 'N/A'}`,
    '',
    '## Notes',
    '',
    '- This report is generated from k6 summary export JSON.',
    '- Publish this markdown summary to Jira using the `perf:jira` script or Jira MCP tools.',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.jsonFile || !args.outputFile) {
    console.error('Usage: node scripts/generate-performance-report.js --json-file <file> --output-file <file> [--jira-key CXINIT2-1234] [--command "..."]');
    process.exit(2);
  }

  if (!fs.existsSync(args.jsonFile)) {
    console.error(`Input JSON not found: ${args.jsonFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(args.jsonFile, 'utf-8');
  const payload = JSON.parse(raw);
  const report = renderMarkdown(payload, args);

  ensureDirForFile(args.outputFile);
  fs.writeFileSync(args.outputFile, report, 'utf-8');
  console.log(`Performance markdown report written: ${args.outputFile}`);
}

main();
