# Product Requirements Document: Dental Procedure Cost Estimator

## Executive Summary
Members frequently do not know what a dental procedure will cost them out-of-pocket before scheduling treatment. This uncertainty drives confusion, unexpected bills, and erodes trust in the plan. This PRD defines a self-service cost estimator experience that lets members look up estimated out-of-pocket costs for common dental procedures based on their plan coverage. The Phase 1 demo uses synthetic data only, persists no PII, and must return estimates with a P95 response time under 300 milliseconds.

## Problem Statement
Members are unable to answer a basic question before treatment: "How much will this cost me?" Current plan materials and portals do not surface a simple, member-facing cost estimate for common procedures. The result is financial confusion, avoidance of necessary care, and reactive calls to support after a bill arrives.

Why now:
- Member confusion around coverage and out-of-pocket cost is an identified top support driver.
- A demo-ready estimator can validate the concept using synthetic data before committing to enterprise API integrations.
- The technical bar is achievable within known constraints.

## Goals & Success Metrics
- Goal 1: Let members estimate their out-of-pocket cost for common dental procedures before scheduling.
- Goal 2: Reduce member confusion about coverage and patient financial responsibility.
- Goal 3: Validate the estimator concept with a demo-quality implementation using synthetic data.

KPIs:
- Primary KPI (demo): Estimator returns a result for all supported procedures within P95 < 300ms.
- Primary KPI (production intent): Reduction in pre-treatment cost-confusion support contacts after general availability.
- Secondary KPI: Member satisfaction with cost transparency at point of decision.

## Personas
- Primary: Dental plan member researching out-of-pocket cost before scheduling or approving a treatment plan.
- Secondary: Dental office staff helping patients understand their estimated patient responsibility before a procedure.
- Secondary: Product and engineering stakeholders validating the demo experience.

## In Scope
- Self-service cost estimator for a defined list of common dental procedures.
- Display of estimated member out-of-pocket cost based on plan coverage tier.
- Coverage-tier-aware cost breakdowns (for example: preventive, basic restorative, major restorative).
- Synthetic data backing for all estimates in Phase 1 (demo).
- Disclaimer language clarifying estimates are approximations, not adjudication guarantees.
- Performance target: P95 response time under 300ms.

## Out of Scope
- Real-time adjudication or live claim processing.
- Persistence of any personally identifiable information (PII).
- Integration with enterprise claims or benefits APIs in Phase 1.
- Procedure cost estimation for specialist or non-covered services not in the defined common-procedure list.
- Appeal or dispute initiation from the estimator.

## Functional Requirements
1. The system shall present a searchable or selectable list of common dental procedures for the member to choose from.
2. The system shall return an estimated out-of-pocket cost for the selected procedure based on the member's plan coverage tier.
3. The system shall display a cost breakdown showing the plan-paid portion and estimated member responsibility.
4. The system shall show a compliance-approved disclaimer stating the estimate is approximate and not a guarantee of payment.
5. The system shall allow a member to select or change their coverage tier to see how the estimate changes.
6. The system shall return all estimate results within a P95 response time of 300 milliseconds.
7. The system shall not collect, store, or transmit any PII as part of the estimation flow.
8. The system shall use synthetic data exclusively in Phase 1; no calls to enterprise APIs shall be made.

Acceptance Criteria:
- Given a member selects a procedure from the supported list, when they request an estimate, then an out-of-pocket cost estimate and plan contribution breakdown are displayed.
- Given any estimate request, when the response is measured at P95 load, then latency is under 300ms.
- Given any user session, when the estimator is used, then no PII is written to any store or transmitted to any external service.
- Given an estimate is displayed, when rendered, then a disclaimer stating "This is an estimate only and not a guarantee of benefits or payment" is visible.
- Given a member changes their coverage tier, when a new tier is selected, then the estimate updates to reflect that tier's cost-sharing rules.

## Non-Functional Requirements
- Performance: P95 response time under 300ms across all supported procedures at expected demo load.
- Privacy: No PII collected, stored, or transmitted at any point in the estimation flow.
- Data: All cost and coverage data backed by synthetic datasets only in Phase 1; no enterprise API dependencies.
- Accessibility: Estimator UI must meet WCAG 2.1 AA for all interactive and result elements.
- Disclaimer: Every estimate result must display a clearly visible approximation disclaimer.
- Portability: Synthetic data layer must be replaceable with a live data source in a future phase without redesigning the estimator interface.

## Dependencies & Constraints
Technical:
- Synthetic procedure cost and coverage dataset must be defined and loaded before development begins.
- No dependency on enterprise benefits or claims APIs in Phase 1.

Organizational:
- Legal/compliance review required for disclaimer language before launch.
- Product owner must approve the final list of in-scope common procedures.

Constraints:
- No PII persisted — enforced at design, implementation, and review stages.
- P95 < 300ms — applies to estimate retrieval from synthetic data layer.
- Demo uses synthetic data only — real plan data integration is a future-phase decision.

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Members interpret estimates as guaranteed benefits | High | Prominent disclaimer on every result; legal review of copy before launch |
| Synthetic data diverges from real plan cost-sharing rules | Medium | Validate synthetic data against representative real plan structures before demo; document deviations |
| Phase 1 synthetic approach creates rework when moving to live data | Medium | Design the data layer as a replaceable interface from the start |
| Procedure list is too narrow to be useful in demo | Medium | Identify top 10–15 procedures by support-call frequency as minimum coverage |
| Performance target not met with naive data lookup | Low | Use in-memory synthetic data; benchmark early in development |

## Assumptions
- "Common dental procedures" means a curated list of 10–15 high-frequency procedure types (for example: cleaning, X-ray, filling, crown, extraction, root canal, deep cleaning). Final list requires product owner sign-off.
- Coverage tiers are simplified to preventive, basic restorative, and major restorative for Phase 1.
- The estimator is a standalone demo experience; portal/app integration is a future-phase decision.
- No authentication or member identity is required for Phase 1 — coverage tier is self-selected.

## Open Questions
- What is the final approved list of common procedures in scope for Phase 1?
- Does the disclaimer language require a specific regulatory review or state-level filing?
- Is there a target demo environment or presentation context that constrains the UI surface (web, mobile, embedded widget)?

## Next Steps
1. Product owner approves the in-scope common procedure list.
2. Engineering defines and populates the synthetic cost and coverage dataset.
3. Legal/compliance reviews and approves disclaimer language.
4. UX designs the procedure selection and estimate result experience.
5. Engineering benchmarks synthetic data lookup to validate the P95 < 300ms target.
6. Demo-ready build reviewed against all acceptance criteria before presentation.
