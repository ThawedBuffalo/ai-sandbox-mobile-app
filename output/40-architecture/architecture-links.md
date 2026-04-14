# Architecture Links

## Repository Artifacts
- Diagram source: 40-architecture/architecture-diagram.mmd
- Diagram markdown: 40-architecture/architecture-diagram.md
- Architecture Design Document backup copy: 40-architecture/ADD.md

## External Targets
- Confluence ADD target (first and primary):
  - https://deltadentalins-sandbox-904.atlassian.net/wiki/spaces/CXINIT/pages/96796675/Architecture+Design+Docs+DevConn
- Published Confluence ADD page:
  - https://deltadentalins-sandbox-904.atlassian.net/wiki/spaces/CXINIT/pages/98140181/Architecture+Design+Document+-+Dental+Cost+Estimator
  - Page ID: 98140181
- Miro architecture diagram:
  - Board: https://miro.com/app/board/uXjVGxhZwqE=/
  - Direct link: https://miro.com/app/board/uXjVGxhZwqE=/?focusWidget=3458764663620342855
- Jira Architecture Review target:
  - Project: CXINIT2
  - Issue type: Task

## Security Design Review
- Jira task: CXINIT2-2740
- URL: https://deltadentalins-sandbox-904.atlassian.net/browse/CXINIT2-2740
- SSD Confluence page: https://deltadentalins-sandbox-904.atlassian.net/spaces/CXINIT/pages/98140163/SSD+-+Dental+Procedure+Cost+Estimator
- Remote links on CXINIT2-2740: Confluence SSD (88855) + Miro frame (88856)
- Full link registry: 50-security/security-links.md

## Current Execution Status
- ADD regenerated locally from cost estimator PRD and user flows.
- Diagram artifacts regenerated locally with Phase 1 synthetic-only and future integration separation.
- Confluence publish: completed in this session (method: POST, pageId: 98140181) — v1.3 ADD with cloud design patterns, External Configuration Store, Health Endpoint Monitoring, Static Content Hosting, Retry, Circuit Breaker, BFF pattern inventory, container security hardening, and structured observability rules.
- Confluence table rendering: publish converter updated to emit HTML tables from Markdown pipe tables; page republished.
- Miro publish: completed (item ID: 3458764663620342855, board: uXjVGxhZwqE=).
- Jira Architecture Review task: not executed in this session.

## Confluence Publish Dry Run
- Script verified: `.github/scripts/publish-confluence-add.py`
- Required arguments verified:
  - `--title`
  - `--space-key`
  - `--parent-id`
  - `--md-path`
- Environment readiness:
  - `JIRA_HOST`: set
  - `JIRA_EMAIL`: set
  - `JIRA_API_TOKEN`: set
- Ready to publish now: Yes

Last publish result:
- Title: ADD - Dental Procedure Cost Estimator
- Method: PUT
- Page ID: 96665602
- URL: https://deltadentalins-sandbox-904.atlassian.net/spaces/CXINIT/pages/96665602/ADD+-+Dental+Procedure+Cost+Estimator

Command template:
`python3 .github/scripts/publish-confluence-add.py --title "ADD - Dental Procedure Cost Estimator" --space-key "CXINIT" --parent-id "96796675" --md-path "40-architecture/ADD.md"`

## Publish Order
1. Publish ADD to Confluence parent page above (primary output).
2. Update local ADD backup copy if Confluence content is revised during publish.
3. Publish Miro architecture diagram or link Mermaid artifact if Miro MCP is unavailable.
4. Create Jira Architecture Review task and attach Confluence and diagram links.

## Blockers
- Jira write integration is required to execute review-task creation from this environment.

## Notes
- ADD content remains Jira-free by policy.
- Jira keys and links are tracked only in this architecture-links file.

## Approval Artifacts
- Workflow: 60-approvals/templates/APPROVAL-WORKFLOW.md
- Decisions register: 60-approvals/records/APPROVAL-DECISIONS.md
- Architecture checklist: 60-approvals/templates/ARCHITECTURE-REVIEW-CHECKLIST.md
- Security checklist: 60-approvals/templates/SECURITY-REVIEW-CHECKLIST.md
- Compliance template: 60-approvals/templates/COMPLIANCE-REVIEW-TEMPLATE.md

## Approval Gate Status (Current)
- Architecture leadership gate: In Review
- Security leadership gate: In Review
- Compliance gate: In Review (required for disclaimer language and related user-facing release items)
