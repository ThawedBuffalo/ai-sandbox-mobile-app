# UX Brief: Dental Procedure Cost Estimator

## Source Requirements
- Primary source: 20-product/prd-dental-cost-estimator.md
- Date interpreted: 2026-03-14
- Accessibility target: WCAG 2.1 AA
- Target platform: Responsive web (desktop and mobile)

## Product Goal and UX Outcome
Members need a fast, understandable estimate of out-of-pocket cost before treatment decisions. The UX outcome is a low-friction estimator that clearly separates estimate from guarantee, exposes plan-paid and member-paid values, and supports quick coverage-tier comparison without collecting any PII.

## Personas and Top Tasks
- Primary persona: Dental plan member checking likely cost before scheduling care.
- Secondary persona: Dental office staff helping patients compare expected responsibility.
- Top task: Select procedure and coverage tier, then get estimate with breakdown and disclaimer.

## In-Scope Experience
- Procedure selection from approved common list (10-15 procedures).
- Coverage tier selection: preventive, basic restorative, major restorative.
- Estimate response showing:
  - Estimated member responsibility
  - Estimated plan-paid amount
  - Required disclaimer text
- In-place recalculation when tier changes.
- Clear handling for unsupported procedures and technical failures.

## Out-of-Scope Experience
- Authentication and member profile lookup.
- Real-time claims adjudication or enterprise API integration.
- Specialist/non-covered services outside approved procedure list.
- Appeals, disputes, or payment workflows.

## Information Architecture
- IA model: Single-page, task-first flow
- Regions:
  - Header/context
  - Input panel (procedure, tier, estimate action)
  - Result panel (loading, success, error, unsupported)
- Navigation behavior:
  - No multi-page dependency for core flow
  - All recovery actions keep user in same context

## Primary User Journeys
1. Supported procedure estimate
2. Tier comparison from an existing result
3. Unsupported procedure recovery
4. Error and retry recovery

## Screen Inventory and State Coverage
| Screen | Purpose | States |
| --- | --- | --- |
| Estimator Home | Select inputs and request estimate | empty, validation-error, loading-options, options-ready, options-load-error |
| Result Panel | Show estimate and breakdown | loading, success, retrieval-error |
| Unsupported Procedure State | Guide user to supported list | unsupported-success |
| Retry Recovery State | Recover from transient system issues | error, retry-loading, retry-success |

## Requirement Traceability
| PRD Requirement | UX Coverage |
| --- | --- |
| FR1 Procedure selection | Searchable/selectable procedure control on Estimator Home |
| FR2 Estimate by tier | Estimate request bound to selected tier |
| FR3 Breakdown display | Result panel with member-paid and plan-paid values |
| FR4 Disclaimer visibility | Required disclaimer always shown in success state |
| FR5 Tier change updates estimate | Tier change triggers in-place recalculation |
| FR6 P95 < 300ms | Immediate loading feedback and minimal interaction overhead |
| FR7 No PII | No user identity fields or PII capture surfaces |
| FR8 Synthetic data only | No UI cues implying live adjudication |

## Accessibility Requirements
- All controls are keyboard operable with visible focus.
- Reading/focus order follows task sequence.
- Dynamic result and error updates are announced via ARIA live regions.
- Errors are explicit, actionable, and linked to controls.
- Status is never conveyed by color alone.
- Text and control contrast meets WCAG 2.1 AA.

## Content Requirements
- Required disclaimer text:
  - "This is an estimate only and not a guarantee of benefits or payment"
- Voice and tone:
  - Plain language, confidence-calming, no technical jargon.

## Open Items from PRD
- Product owner final sign-off on the 10-15 in-scope procedures.
- Legal/compliance final sign-off for disclaimer language.
- Confirm default tier selection strategy for initial load.
