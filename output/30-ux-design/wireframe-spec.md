# Wireframe Spec: Dental Procedure Cost Estimator

## Breakpoint and Layout
- Desktop reference: 1280 width, content max 960
- Mobile reference: 390 width, single-column
- Grid:
  - Desktop: 12 columns, 24 gutter
  - Mobile: 4 columns, 16 gutter
- Spacing scale: 4, 8, 12, 16, 24, 32

## Page Regions
1. Header
2. Input module
3. Result module
4. Legal/disclaimer module

## Component Catalog
| Component | Purpose | States | Requirement Mapping |
| --- | --- | --- | --- |
| Procedure Selector | Select supported procedure | empty, focus, populated, validation-error, load-error | FR1 |
| Tier Selector | Select coverage tier | default, focus, selected, disabled | FR5 |
| Estimate Action Button | Trigger estimate | default, focus, disabled, loading | FR2 |
| Result Card | Show cost outputs | loading, success, error, unsupported | FR2, FR3 |
| Breakdown Rows | Show plan/member split | success | FR3 |
| Disclaimer Block | Required legal statement | visible (success), hidden (non-success) | FR4 |
| Inline Error Alert | Recovery guidance | error, retry-loading | AC error handling |

## Screen A: Estimator Home
- Primary purpose: Collect procedure + tier
- Required elements:
  - Procedure control (search/select)
  - Tier control (three choices)
  - Estimate action
- States:
  - options-loading
  - options-ready
  - options-load-error
  - validation-error

## Screen B: Estimate Result (In Place)
- Primary purpose: Present estimate outcome without navigation change
- Required elements:
  - Result heading
  - Member responsibility amount
  - Plan-paid amount
  - Disclaimer text
- States:
  - loading (skeleton + progress text)
  - success (values + disclaimer)
  - retrieval-error (error alert + retry)

## Screen C: Unsupported Procedure State
- Trigger: Unsupported procedure submitted
- Required elements:
  - Message title
  - Plain-language explanation
  - CTA to supported selection

## Screen D: Recovery State
- Trigger: Technical error on estimate/recalculate
- Required elements:
  - Error summary in result region
  - Retry action
  - Optional edit-selection action

## Interaction Rules
- Estimate action remains disabled until both inputs are valid.
- Tier change from success state re-runs estimate in place.
- Latest request wins during fast repeated tier changes.
- Retry preserves selected procedure and tier.

## Required UI Copy
- Estimate CTA: "Estimate cost"
- Disclaimer: "This is an estimate only and not a guarantee of benefits or payment"
- Generic error: "We couldn't calculate your estimate right now. Please try again."
- Unsupported message: "This procedure is not supported in the Phase 1 estimator. Please choose a supported procedure."

## Accessibility and Semantics
- Procedure selector exposes proper combobox/listbox semantics.
- Tier selector implemented as radio group with explicit labels.
- Result updates announced through polite live region.
- Error summaries use alert semantics and receive focus on failure.
- Focus order: Header -> Procedure -> Tier -> Estimate -> Result -> Disclaimer.

## Implementation IDs (Suggested)
- cost-estimator-page
- procedure-selector
- coverage-tier-selector
- estimate-submit
- estimate-result-region
- estimate-disclaimer
- estimate-error-alert
