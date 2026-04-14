# Sprint Plan - CXINIT2 - Cost Estimator

## Sprint Goal
Deliver a demo-ready slice of epic CXINIT2-2726 that enables end-to-end estimate generation and tier comparison with clear error handling, while proving core performance and privacy controls.

## Sprint Backlog (selected stories with estimates)
Sprint window: 2 weeks (assumed 2026-03-16 to 2026-03-27)
Capacity: 20 points

Selected (20 points total):
- CXINIT2-2727 Procedure selection from supported common-procedure list - 3 points (confidence: High)
- CXINIT2-2728 Coverage-tier-based out-of-pocket estimate retrieval - 5 points (confidence: Medium)
- CXINIT2-2730 Coverage-tier switch recalculates estimate - 3 points (confidence: Medium)
- CXINIT2-2731 Graceful handling for unsupported estimate requests - 3 points (confidence: High)
- CXINIT2-2732 Performance target for estimate retrieval - 3 points (confidence: Medium)
- CXINIT2-2733 No-PII enforcement across estimator flow - 3 points (confidence: Medium)

Deferred from this sprint:
- CXINIT2-2729 Estimate result breakdown with compliance disclaimer (blocked by legal disclaimer approval; move to next sprint unless approved in-sprint)
- CXINIT2-2734 Synthetic-data-only enforcement for Phase 1 (deferred by capacity; partial coverage through 2733 checks)
- CXINIT2-2735 WCAG 2.1 AA accessibility validation (deferred by capacity)
- CXINIT2-2736 Compliance disclaimer visibility validation (depends on legal-approved copy)

## Refinement Results (splits, clarifications, acceptance criteria updates)
- Story split recommendation for CXINIT2-2728:
  - Split A: calculation service for selected procedure + tier
  - Split B: response contract and data mapping
  - Decision: keep unsplit this sprint, but execute as two implementation tasks under same story.
- Clarification added:
  - CXINIT2-2731 will treat unsupported procedures as expected business condition (not 5xx technical failure).
- Acceptance criteria tightening:
  - CXINIT2-2732 benchmark must include representative supported-procedure mix and report P95.
  - CXINIT2-2733 must include storage, logs, and outbound traffic audit evidence.

## Dependencies and Risks (with owner and mitigation)
Dependencies:
- Common procedure list sign-off for CXINIT2-2727/2728/2731.
  - Owner: Product Owner
  - Mitigation: lock final list by sprint day 2; default to initial top-10 list if delayed.
- Synthetic dataset readiness for CXINIT2-2728/2730/2732.
  - Owner: Engineering Lead
  - Mitigation: preload baseline dataset before first implementation day.
- Test environment and load script readiness for CXINIT2-2732.
  - Owner: QA + DevOps
  - Mitigation: smoke benchmark by mid-week 1.

Approval dependencies:
- Architecture leadership gate for ADD.
  - Owner: Architecture Leadership
  - Workflow: 60-approvals/templates/APPROVAL-WORKFLOW.md
  - Checklist: 60-approvals/templates/ARCHITECTURE-REVIEW-CHECKLIST.md
  - Decision log: 60-approvals/records/APPROVAL-DECISIONS.md
- Security leadership gate for SSD.
  - Owner: Security Leadership
  - Workflow: 60-approvals/templates/APPROVAL-WORKFLOW.md
  - Checklist: 60-approvals/templates/SECURITY-REVIEW-CHECKLIST.md
  - Decision log: 60-approvals/records/APPROVAL-DECISIONS.md
- Compliance gate for disclaimer language (when applicable).
  - Owner: Legal or Compliance Leadership
  - Template: 60-approvals/templates/COMPLIANCE-REVIEW-TEMPLATE.md
  - Decision log: 60-approvals/records/APPROVAL-DECISIONS.md

Gate execution model:
- Architecture and Security reviews run in parallel for speed.
- Compliance can run in parallel but blocks promotion where required by environment rules.

Risks:
- Risk: Estimate retrieval complexity may exceed expected effort for 2728.
  - Impact: Medium
  - Mitigation: timebox rule implementation spike to 1 day, then lock scope.
- Risk: Privacy audit may reveal hidden payload leakage in logs.
  - Impact: High
  - Mitigation: enforce explicit log redaction review before feature merge.
- Risk: Unapproved disclaimer delays downstream result-story completion.
  - Impact: Medium
  - Mitigation: keep disclaimer-dependent stories out of committed sprint scope.

## DoR Check Results (pass/fail by story)
- CXINIT2-2727: Pass (clear value, AC testable, dependencies known)
- CXINIT2-2728: Pass (medium uncertainty; assumptions documented)
- CXINIT2-2730: Pass (depends on 2728 output contract)
- CXINIT2-2731: Pass (error taxonomy clarified)
- CXINIT2-2732: Pass (validation method defined; env dependency identified)
- CXINIT2-2733: Pass (audit scope and evidence criteria defined)
- CXINIT2-2729: Fail (compliance copy approval pending)
- CXINIT2-2736: Fail (blocked by same compliance dependency)

## DoD Checklist
- Code complete, peer reviewed, and merged
- Unit/integration tests pass for selected stories
- Relevant AC scenarios validated in test evidence
- NFR checks completed for selected NFR items (2732, 2733)
- No critical defects open on selected stories
- Sprint demo script prepared for goal-aligned functionality

## Standup Prompts
Engineering:
- Which selected story moved us closest to sprint goal yesterday?
- What dependency is currently limiting delivery pace?
- Which item is at spillover risk and what scope trade-off is proposed?

QA:
- Which AC scenarios are now pass/fail with evidence?
- Are benchmark/privacy checks on track for 2732/2733?
- Any environment/data blockers requiring escalation today?

Product:
- Any scope or priority changes affecting selected items?
- Is procedure-list sign-off finalized?
- Has compliance disclaimer review status changed?
