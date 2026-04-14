# Design Handoff: Dental Procedure Cost Estimator

## Source Inputs
- PRD: 20-product/prd-dental-cost-estimator.md
- UX artifacts:
  - 30-ux-design/ux-brief.md
  - 30-ux-design/ux-flow.md
  - 30-ux-design/user-flows.md
  - 30-ux-design/wireframe-spec.md
- Figma target from project config:
  - URL: https://www.figma.com/design/Mpbx4Oqsr9kMPqBGeas76y/Untitled
  - Key: Mpbx4Oqsr9kMPqBGeas76y

## Delivered Scope
- Supported procedure estimate flow
- Tier comparison flow
- Unsupported procedure handling
- Technical error and retry flow
- Responsive behavior for desktop/mobile

## Design-to-Requirement Traceability
| Requirement | UX Implementation |
| --- | --- |
| FR1 Select/search procedures | Procedure selector with supported list |
| FR2 Estimate by selected tier | Estimate action and result calculation state |
| FR3 Show plan/member breakdown | Result card with two labeled amounts |
| FR4 Show disclaimer on estimate | Disclaimer block in every success result |
| FR5 Tier change updates estimate | In-place recalculation on tier switch |
| FR6 P95 < 300ms | Immediate loading feedback and minimal steps |
| FR7 No PII | No personal input fields in any flow |
| FR8 Synthetic data only | No UI assumptions for enterprise API adjudication |

## Interaction Contract
- Input payload:
  - procedureId
  - coverageTier
- Success payload:
  - memberResponsibility
  - planPaidAmount
  - disclaimerText
- Error payload:
  - userSafeMessage
  - retryAvailable

## Behavior Rules for Engineering
- Estimate button enabled only when procedure + tier are valid.
- All estimate/recalculate requests render loading state immediately.
- Tier changes re-run estimate while preserving selected procedure.
- Latest request wins for rapid tier changes.
- Retry does not clear previous valid selections.
- Unsupported procedures map to guided unsupported state, not generic error.

## Accessibility Requirements for Build
- Keyboard-only flow coverage for all controls and retry actions.
- Focus moves to first invalid control on validation errors.
- Error summary uses alert semantics and receives focus when shown.
- Result update uses polite live region announcement.
- All labels and helper text are programmatically bound to controls.
- WCAG 2.1 AA contrast baseline for text, controls, and state indicators.

## QA Acceptance Focus
- Functional:
  - Supported procedure + tier returns estimate + disclaimer
  - Tier switch updates values
  - Unsupported procedure shows guided recovery
  - Retry recovers from transient failures
- Non-functional:
  - P95 latency < 300ms at expected demo load
  - No PII in payloads, logs, storage, telemetry
  - No enterprise API calls in Phase 1 run path
- Accessibility:
  - Keyboard and screen-reader checks across empty/loading/error/success

## Figma Execution Plan
- Create/update page names:
  - 01 Flow Map
  - 02 Wireframes Desktop
  - 03 Wireframes Mobile
  - 04 Components and States
  - 05 Handoff Notes
- Frame naming:
  - EST-01 Home Empty (Desktop)
  - EST-02 Home Ready (Desktop)
  - EST-03 Result Success (Desktop)
  - EST-04 Result Error (Desktop)
  - EST-05 Unsupported Procedure (Desktop)
  - EST-06 Home Ready (Mobile)
  - EST-07 Result Success (Mobile)
- Detailed build sequence:
  - See 30-ux-design/figma-build-checklist.md

## Open Decisions
- Final approved procedure list (10-15) from product owner.
- Final legal/compliance approval for disclaimer copy.
- Default tier value on first load.

## Blockers
- Figma MCP write actions were not executed in this run because no Figma MCP execution tool is available in the current environment.
