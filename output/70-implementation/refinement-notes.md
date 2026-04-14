# Refinement Notes - Sprint Plan for CXINIT2-2726

## Scope Context
- Project: CXINIT2
- Focus epic: CXINIT2-2726 (Dental Procedure Cost Estimator, Phase 1)
- Sprint capacity target: 20 points over 2 weeks

## Story Estimation Details
- CXINIT2-2727: 3 points, High confidence
  - Assumptions: approved top-procedure list available by day 2
- CXINIT2-2728: 5 points, Medium confidence
  - Assumptions: synthetic coverage-tier rule mapping finalized
- CXINIT2-2730: 3 points, Medium confidence
  - Assumptions: recalculation reuses same response contract as 2728
- CXINIT2-2731: 3 points, High confidence
  - Assumptions: unsupported-procedure taxonomy finalized
- CXINIT2-2732: 3 points, Medium confidence
  - Assumptions: load-test harness and test env available in week 1
- CXINIT2-2733: 3 points, Medium confidence
  - Assumptions: audit tooling/log access available

Total committed: 20 points

## Split and Sequencing Recommendations
- Sequence:
  1. 2727 (procedure selection)
  2. 2728 (estimate retrieval)
  3. 2730 + 2731 (tier switching and error handling)
  4. 2732 + 2733 (performance and privacy validations)
- Split candidate retained for future if risk materializes:
  - 2728 into "calculation logic" and "response contract + integration"

## AC Improvements Applied
- 2732 AC addendum: P95 benchmark must run across representative supported-procedure mix.
- 2733 AC addendum: validation must explicitly include storage, logs, and outbound traffic.
- 2731 AC addendum: unsupported procedure path must provide user recovery action and avoid technical error exposure.

## Deferred Item Rationale
- 2729, 2736 deferred due to legal/compliance disclaimer dependency not confirmed sprint-ready.
- 2734, 2735 deferred due to capacity after selecting core functional slice + two critical NFR controls.

## Open Questions to Close During Sprint Week 1
- Final approved procedure list received from Product Owner?
- Compliance disclaimer timeline and approver identified?
- Benchmark environment and data parity confirmed?
