# UX Flow Summary: Dental Procedure Cost Estimator

## Source
- PRD: 20-product/prd-dental-cost-estimator.md
- Related UX docs:
  - 30-ux-design/ux-brief.md
  - 30-ux-design/user-flows.md
  - 30-ux-design/wireframe-spec.md

## Flow Catalog
| Flow ID | Flow Name | Entry | Exit |
| --- | --- | --- | --- |
| UX-F1 | Supported Procedure Estimate | User opens estimator and selects valid inputs | Estimate displayed with breakdown and disclaimer |
| UX-F2 | Tier Comparison | Existing success result | Updated estimate shown for selected tier |
| UX-F3 | Unsupported Procedure Recovery | Unsupported procedure submitted | User returns to supported procedure selection |
| UX-F4 | Error and Retry | Estimate/recalculate request fails | Success after retry or stable recoverable error |

## Detailed States by Flow

### UX-F1 Supported Procedure Estimate
- empty:
  - No valid inputs selected
  - Estimate action disabled
- loading:
  - Estimate requested
  - Result region shows progress status
- success:
  - Member responsibility shown
  - Plan-paid amount shown
  - Disclaimer shown: "This is an estimate only and not a guarantee of benefits or payment"
- error:
  - Validation error if required input missing
  - Retrieval error if estimate call fails

### UX-F2 Tier Comparison
- loading:
  - Tier changed on success result
  - Recalculation status shown in result region
- success:
  - Updated amounts for newly selected tier
  - Disclaimer remains visible
- error:
  - Recalculation failure with retry action

### UX-F3 Unsupported Procedure Recovery
- unsupported-success:
  - Unsupported message displayed
  - Recovery CTA routes to supported selection

### UX-F4 Error and Retry
- error:
  - User-safe error text with retry action
- retry-loading:
  - Retry request in progress
- retry-success:
  - Normal success result restored

## Screen-State Matrix
| Screen | empty | loading | success | error | unsupported |
| --- | --- | --- | --- | --- | --- |
| Estimator Home | Yes | options-loading | options-ready | options-load-error, validation-error | No |
| Result Region | No | estimate-loading, recalc-loading | estimate-success | retrieval-error | unsupported-guidance |

## Accessibility Coverage by State
- empty:
  - Disabled primary action communicates unavailable state clearly.
- loading:
  - Loading message announced via live region.
- success:
  - Result heading/value order is screen-reader friendly.
- error:
  - Error summary uses alert semantics and receives focus.
- unsupported:
  - Recovery CTA is keyboard reachable and clearly labeled.

## Requirement Mapping
| PRD Reference | UX Flow Coverage |
| --- | --- |
| FR1 | UX-F1 procedure selection |
| FR2 | UX-F1 estimate retrieval, UX-F2 recalculation |
| FR3 | UX-F1 success result breakdown |
| FR4 | UX-F1 and UX-F2 success states include disclaimer |
| FR5 | UX-F2 tier comparison behavior |
| FR6 | UX-F1/UX-F2 loading pattern optimized for fast feedback |
| FR7 | All flows avoid identity/PII collection |
| FR8 | All flows assume synthetic-data-backed estimation only |

## Notes for Engineering and QA
- Keep user inputs intact across loading/error transitions.
- Implement latest-request-wins behavior for rapid tier switching.
- Validate every flow in desktop and mobile viewport variants.
