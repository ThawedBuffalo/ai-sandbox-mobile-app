# User Flows: Dental Procedure Cost Estimator

## Flow 1: First Estimate for Supported Procedure
- Persona: Dental plan member
- Entry: Estimator page opens
- Exit: Estimate result shown with required disclaimer

### Steps
1. User sees procedure selector, tier selector, and Estimate action.
2. User selects a supported procedure from list.
3. User selects coverage tier.
4. User activates Estimate.
5. Result region enters loading state.
6. System returns estimate and renders:
	- Member responsibility
	- Plan-paid amount
	- Required disclaimer

### Edge Cases
- Procedure options fail on initial load.
- User submits with missing required inputs.

### Recovery Rules
- Options-load error includes Retry action.
- Validation errors are inline and focus first invalid control.
- Failed estimate keeps current selections for quick retry.

## Flow 2: Tier Comparison on Existing Result
- Persona: Member or office staff
- Entry: Success result visible
- Exit: Updated estimate shown for new tier

### Steps
1. User changes selected tier.
2. UI enters recalculation loading state.
3. System recalculates with same procedure and new tier.
4. Result updates values and keeps disclaimer visible.

### Edge Cases
- Rapid tier toggling.
- One tier fails while others are valid.

### Recovery Rules
- Latest-selection-wins behavior for rapid changes.
- Recalculation failure shown inline with Retry.

## Flow 3: Unsupported Procedure Handling
- Persona: Member
- Entry: Unsupported procedure submitted
- Exit: User returns to valid procedure selection

### Steps
1. System identifies unsupported procedure.
2. Result region shows unsupported guidance message.
3. User selects CTA to return to supported list.
4. User chooses supported procedure and restarts estimate.

### Recovery Rules
- Keep tier selection if still valid.
- Provide direct supported-list CTA, no dead end.

## Flow 4: Technical Failure and Retry
- Persona: Member
- Entry: Any estimate/recalculation request
- Exit: Success result or clear next action

### Steps
1. User triggers estimate request.
2. UI immediately shows loading state.
3. If service fails or times out, error state appears in result region.
4. User can Retry without re-entering selections.
5. On success, result and disclaimer are restored.

### Recovery Rules
- User-safe message only, no internal error details.
- Input context preserved between failures.

## State Matrix
| Flow | Empty | Loading | Success | Error |
| --- | --- | --- | --- | --- |
| Flow 1 | No input selected | Estimate requested | Breakdown + disclaimer | Validation/options/retrieval error |
| Flow 2 | Existing result context | Recalculation | Updated breakdown + disclaimer | Recalculation error + retry |
| Flow 3 | N/A | N/A | Unsupported guidance with CTA | N/A |
| Flow 4 | N/A | Request pending | Result restored | Technical error + retry |

## Accessibility Notes Across Flows
- Focus remains predictable after state changes.
- Result updates use polite live region announcements.
- Error banners use alert semantics and actionable controls.
- All primary interactions are keyboard accessible.
