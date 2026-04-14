# Approval Workflow

## Purpose
Define a fast, auditable approval workflow for architecture and security artifacts using repository documentation plus Jira traceability.

## Scope
- Architecture Design Document (ADD)
- Security Solution Design (SSD)
- Compliance disclaimer approval when user-facing copy or legal language changes

## Approval Authorities
| Domain | Primary Approver | Backup Approver | Decision Authority |
|---|---|---|---|
| Architecture | Architecture Leadership | Principal Architect | Approve, request changes, or reject architecture readiness |
| Security | Security Leadership | Senior Security Architect | Approve, request changes, or reject security readiness |
| Compliance | Legal or Compliance Leadership | Product Leadership | Approve, request changes, or reject disclaimer/legal language |

## Decision States
- Draft: Artifact is being prepared and not yet submitted.
- In Review: Leadership review is in progress.
- Changes Requested: Reviewer requires rework before final decision; artifact returns to author with explicit actions, owner, and due date.
- Approved: Gate passed with no open conditions.
- Approved with conditions: Gate passed with tracked conditions and due dates.
- Rejected: Gate failed and requires rework before resubmission.

## Decision Transition Rules
- Draft -> In Review
- In Review -> Changes Requested, Approved, Approved with conditions, or Rejected
- Changes Requested -> In Review after evidence-backed rework is submitted
- Approved with conditions -> Approved when all conditions are closed and closure evidence is recorded

## Agile Review Rules
- Architecture and Security reviews run in parallel by default.
- Compliance review can run in parallel, but production promotion remains blocked until compliance is approved when applicable.
- Change requests should be resolved within 3 business days unless a major redesign is approved by product and engineering leadership.
- SLA targets:
  - Architecture review: 2 business days
  - Security review: 2 business days
  - Compliance review: 3 business days
- Escalation: Any In Review or Changes Requested item older than SLA is escalated to Product and Engineering leadership in daily standup.

## Entry Criteria
- Artifact status is Draft and content is complete for current release scope.
- Linked checklist is filled with evidence.
- Jira review issue exists and links to artifact + checklist.
- Known risks and assumptions are explicitly listed.

## Exit Criteria
- Decision is recorded in 60-approvals/records/APPROVAL-DECISIONS.md.
- Jira review issue is transitioned to Changes Requested, Approved, Approved with conditions, or Rejected.
- If conditional approval is used, each condition has owner, due date, and closure evidence link.
- If changes are requested, each requested change has owner, required-by date, and closure evidence before returning to In Review.

## Environment Promotion Matrix
| Environment | Allowed Decision | Additional Rules |
|---|---|---|
| Any | N/A | Promotion is blocked while any required approval issue is in Changes Requested |
| Development | Approved, Approved with conditions | Conditions can remain open if owner and due date are recorded |
| Staging | Approved, Approved with conditions | No unresolved high-severity security condition |
| UAT | Approved, Approved with conditions | Product and Security must accept any remaining conditions |
| Production | Approved | Approved with conditions requires formal exception from Architecture + Security leadership |

## Jira Traceability Standard
Each release train should have at minimum:
- 1 Architecture review issue
- 1 Security review issue
- 1 Compliance review issue when legal copy or compliance controls are in scope

Required fields in each review issue:
- Artifact link
- Checklist link
- Decision state
- Target environment
- Review round (R1, R2, ...)
- Change request ID (when Changes Requested is used)
- Requested by and required-by date (when Changes Requested is used)
- Conditions (if any)
- Condition expiry date (if conditional)

## Workflow Sequence
1. Publish draft ADD and SSD.
2. Open Architecture and Security Jira review issues.
3. Run Architecture and Security leadership reviews in parallel.
4. If reviewer requests updates, set decision to Changes Requested and document change actions, owner, and required-by date in Jira and APPROVAL-DECISIONS.md.
5. Author updates artifact and links closure evidence; reviewer returns issue to In Review.
6. Record final decision event in APPROVAL-DECISIONS.md.
7. Open/complete compliance review if required.
8. Apply environment promotion rules and move release forward.

## Review Round Guidance (R1, R2, ...)
Use Review Round values to preserve an audit trail for each request-and-resubmit cycle.

Example progression:
1. R1 In Review (initial submission)
2. R1 Changes Requested (reviewer records CR ID, owner, and required-by date)
3. R2 In Review (author resubmits with closure evidence)
4. R2 Approved or Approved with conditions (or Rejected)

## Re-validation Rules After Changes Requested
- Re-validate all controls directly affected by the requested change.
- Re-validate dependent controls when architecture, trust boundaries, or data handling changed.
- Record new or updated evidence links in both Jira issue comments and APPROVAL-DECISIONS.md.
- Do not promote environments while an approval issue remains in Changes Requested.

## Approver Assistant Runbook (Standard Operating Template)
Use this runbook to execute checklist-driven Architecture and Security approvals with consistent outputs and traceability.

### Purpose
- Standardize approver-assistant review runs across domains.
- Preserve human decision authority while accelerating review cycles.
- Produce audit-ready Jira and decision-register updates every round.

### Scope
- Architecture assistant: ADD review using ARCHITECTURE-REVIEW-CHECKLIST.md.
- Security assistant: SSD review using SECURITY-REVIEW-CHECKLIST.md.

### Required Inputs (Per Run)
- Domain: architecture or security.
- Artifact path:
  - architecture: 40-architecture/ADD.md
  - security: 50-security/SSD-dental-cost-estimator.md
- Checklist path:
  - architecture: 60-approvals/templates/ARCHITECTURE-REVIEW-CHECKLIST.md
  - security: 60-approvals/templates/SECURITY-REVIEW-CHECKLIST.md
- Jira review issue key.
- Review round (R1, R2, ...).
- Target environment.

### Run Steps
1. Confirm entry criteria are met (artifact complete, checklist ready, Jira issue exists).
2. Evaluate each checklist item as Pass, Partial, or Fail with explicit evidence links.
3. Classify findings as blocker, major, or minor.
4. Recommend one decision:
   - In Review
   - Changes Requested
   - Approved
   - Approved with conditions
   - Rejected
5. If decision is Changes Requested:
   - Generate CR IDs (ARC-CR-### or SEC-CR-###)
   - Assign owner and required-by date
   - Define required closure evidence
6. If decision is Approved with conditions:
   - Define condition IDs (ARC-COND-### or SEC-COND-###)
   - Assign owner and due date
   - Define closure evidence
7. Draft and apply Jira update command.
8. Add one decision-event row to APPROVAL-DECISIONS.md.
9. If Changes Requested was used, run re-validation rules on resubmission and record next review round.

### Mandatory Output Package (Per Run)
1. Checklist result table (item, status, evidence).
2. Decision recommendation and rationale.
3. Change requests or conditions (ID, owner, required/due date, closure evidence).
4. Decision register row draft.
5. Jira command draft for state transition.
6. Residual risks and approver sign-off prompt.

### Jira Command Templates
Set Changes Requested:

node .github/scripts/jira-approval-review.js \
  --mode update \
  --issue-key <ISSUE_KEY> \
  --domain <architecture|security> \
  --decision "Changes Requested" \
  --target-env <development|staging|uat|production> \
  --conditions "<CR_ID and required evidence summary>" \
  --due-date <YYYY-MM-DD>

Return to In Review after evidence update:

node .github/scripts/jira-approval-review.js \
  --mode update \
  --issue-key <ISSUE_KEY> \
  --domain <architecture|security> \
  --decision "In Review" \
  --target-env <development|staging|uat|production>

Approve with conditions:

node .github/scripts/jira-approval-review.js \
  --mode update \
  --issue-key <ISSUE_KEY> \
  --domain <architecture|security> \
  --decision "Approved with conditions" \
  --target-env <development|staging|uat|production> \
  --conditions "<COND_ID and closure expectation>" \
  --due-date <YYYY-MM-DD>

### Decision Register Row Template
Use one new row for every decision event:

| Date | Artifact | Domain | Reviewer | Review Round | Decision | Change Request ID | Requested By | Required By | Target Environment | Conditions | Due Date | Resolved Date | Closure Evidence | Jira Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| <YYYY-MM-DD> | <artifact path + version> | <Architecture|Security> | <Leadership role> | <R#> | <Decision> | <CR ID or N/A> | <Requester or N/A> | <Required by or N/A> | <env> | <conditions summary> | <due date or N/A> | <resolved date or Pending> | <evidence link or Pending> | <Jira key> |

### Domain-Specific Notes
- Architecture runs should verify layer separation, APIM governance, NFR realism, risk ownership, and traceability completeness.
- Security runs should verify mandatory gates R4 and R6, unresolved high-severity risk handling, and staging/uat promotion blockers.

### Promotion Guardrails
- Never promote while any required approval issue is in Changes Requested.
- Staging cannot proceed with unresolved high-severity security conditions.
- Production requires Approved unless formal exception is recorded.

### Human Decision Authority
- Assistants can evaluate, recommend, and draft updates.
- Final decision and sign-off remain with Architecture Leadership and Security Leadership.