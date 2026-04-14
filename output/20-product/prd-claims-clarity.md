# Product Requirements Document: Plain-Language Claim Explanation

## Executive Summary
Members frequently receive denied or partially paid claim outcomes and still do not understand what happened, why it happened, or what to do next. Current Explanation of Benefits (EOB) content is technically accurate but not member-friendly, which drives avoidable support calls and creates friction for dental offices. This PRD defines a Phase 1 experience in the member portal that translates claim outcomes into plain language with clear next steps. The primary success metric is reduction in EOB-related support calls.

## Problem Statement
Members reviewing claim outcomes in EOBs struggle to interpret denial codes, abbreviations, and adjustment reasons. As a result, they contact support for clarification and often involve dental offices in insurance explanations, increasing operational burden and trust friction. The organization already has denial reason codes and claim metadata, but this information is surfaced in a raw format rather than understandable language.

Why now:
- Support reports high call volume tied to EOB interpretation.
- Typical calls for explanation are long (10 to 15 minutes).
- A feasible technical foundation exists (existing reason codes and metadata).

## Goals & Success Metrics
- Goal 1: Improve member understanding of claim outcomes in self-service channels.
- Goal 2: Reduce support burden caused by EOB explanation calls.
- Goal 3: Reduce provider-office friction caused by member confusion.

KPIs:
- Primary KPI: Reduce EOB-related support calls after rollout (baseline and target to be finalized before launch).
- Secondary KPI: Increase percentage of members who view explanation details before initiating a support contact.
- Secondary KPI: Improve post-interaction clarity satisfaction for claim explanation touchpoints.

## Personas
- Primary: Member (policyholder/dependent) reviewing a denied, partially paid, or otherwise non-intuitive claim outcome.
- Secondary: Customer support agent handling claim clarification calls.
- Secondary: Dental office staff explaining insurance outcomes to patients.
- Secondary: Internal operations and product stakeholders monitoring claim communication quality.

## In Scope
- Member portal claim-details experience for all claim outcomes in Phase 1.
- Plain-language translation of claim outcome and reason metadata.
- Explanation structure that answers:
	- What happened
	- Why it happened
	- What to do next
- Contextual next-step guidance (for example: contact provider, contact support, review appeal eligibility instructions).
- Compliance-approved disclaimer language and escalation path to support.

## Out of Scope
- Replacing customer support.
- Building an end-to-end appeals submission workflow.
- Re-adjudicating claims or changing coverage rules.
- Providing legal, clinical, or financial advice.
- Delivering explanations outside the member portal in Phase 1.

## Functional Requirements
1. The system shall display a plain-language summary for each claim outcome in the member portal claim details view.
2. The system shall present each explanation in three sections: what happened, why it happened, and what to do next.
3. The system shall map claim reason codes/metadata to approved plain-language content.
4. The system shall include a clear member action path when applicable, including when to contact support or provider.
5. The system shall show compliance-approved disclaimer text with each explanation.
6. The system shall log explanation impressions and next-action clicks for KPI analysis.
7. The system shall preserve access to raw claim/EOB details for users who need technical detail.
8. The system shall provide a support handoff entry point from the explanation view.

Acceptance Criteria:
- Given a denied claim with a known reason code, when a member opens claim details, then a plain-language explanation is shown with all three sections populated.
- Given a partially paid claim, when a member opens claim details, then the explanation includes member-responsibility context and next steps.
- Given an unknown or unmapped reason code, when a member opens claim details, then a safe fallback explanation and support handoff are shown.
- Given any explanation view, when rendered, then compliance disclaimer content is visible.
- Given production telemetry, when reporting period ends, then EOB-related support-call trend can be compared pre/post launch.

## Non-Functional Requirements
- Performance: Explanation content retrieval/rendering must not materially degrade claim details load time (SLO to be finalized with engineering).
- Accuracy: All mappings and user-facing language must pass product, operations, and legal/compliance review before launch.
- Accessibility: Experience must meet WCAG 2.1 AA for text clarity, contrast, structure, and keyboard access.
- Reliability: Explanation service availability must align with claim-details page availability objectives.
- Auditability: Explanation mapping versions and disclaimer versions must be traceable for compliance review.

## Dependencies & Constraints
Technical dependencies:
- Reliable access to claim outcome metadata and reason codes.
- Mapping framework for translating technical reasons into plain-language templates.
- Telemetry instrumentation for view/click and support deflection analysis.

Organizational dependencies:
- Legal/compliance review and approval workflow.
- Customer support input on common confusion patterns and escalation language.
- UX content and design support for readability and information hierarchy.

Constraints:
- Must maintain factual alignment with adjudication outcomes.
- Must not imply policy reinterpretation or guarantee appeal success.
- Phase 1 surface is limited to member portal claim details.

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Plain-language explanation is interpreted as policy override | High | Include explicit disclaimer and align language to adjudication source of truth |
| Incomplete mapping coverage causes confusing edge cases | High | Launch with fallback explanation and prioritize top-volume mappings first |
| Measured call reduction is inconclusive due to weak baseline | Medium | Establish pre-launch baseline window and normalized call taxonomy |
| Content drifts from policy updates over time | Medium | Introduce mapping version control and periodic compliance review cadence |
| Members still require assisted support for complex scenarios | Medium | Keep prominent support handoff and do not position feature as support replacement |

## Open Questions
- What specific numeric target and measurement window should be set for support call reduction?
- What is the minimum mapping coverage threshold required for launch readiness?
- What fallback copy and routing logic should apply to rare/unmapped scenarios?
- Should multilingual content begin in Phase 1 or Phase 2?

## Assumptions
- Existing claim metadata is sufficient to power meaningful plain-language explanations for most outcomes.
- A significant share of EOB-related support demand is caused by comprehension gaps rather than adjudication errors.
- Portal placement is adequate for initial adoption and measurable impact.

## Next Steps
1. Define baseline EOB-related support-call volume and finalize post-launch measurement window.
2. Prioritize top claim reason categories and draft plain-language templates for each.
3. Complete legal/compliance review of explanation and disclaimer patterns.
4. Finalize UX content and interaction design for claim-details integration.
5. Implement telemetry and reporting to evaluate KPI movement after launch.