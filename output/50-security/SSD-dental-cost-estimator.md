# Lightweight Security Solution Design (SSD)

**Title:** Dental Procedure Cost Estimator — Phase 1 Demo
**Status:** Draft
**Owner:** Security Team (Cyber Risk Management)
**Last Updated:** 2026-03-14

---

## 1. Header

| Field | Value |
|---|---|
| Title | Lightweight Security Solution Design — Dental Procedure Cost Estimator |
| Status | Draft |
| Owner | Security Team (Cyber Risk Management) |
| Last Updated | 2026-03-14 |
| Project | CXINIT2 |
| Phase | Phase 1 — Demo / Synthetic Data Only |

---

## 2. System Overview

The Dental Procedure Cost Estimator is a self-service, web-based tool that allows dental plan members to look up estimated out-of-pocket costs for common dental procedures before scheduling treatment. Users select a procedure and a coverage tier (preventive, basic restorative, or major restorative); the system returns a cost breakdown showing plan-paid and member-responsibility amounts, backed exclusively by synthetic data in Phase 1.

**Who uses it:**
- Primary: Dental plan members researching pre-treatment out-of-pocket cost.
- Secondary: Dental office staff helping patients understand estimated patient responsibility.
- Secondary: Product and engineering stakeholders validating the demo experience.

**Why it exists:** Member confusion about pre-treatment costs is a top support-contact driver. Phase 1 validates the concept using synthetic data without requiring live claims or benefits API integration, protecting member data while accelerating delivery.

**Key constraint:** No personally identifiable information (PII) is collected, stored, or transmitted at any point in the estimation flow.

---

## 3. Scope

### In Scope
- React/Node UI (procedure selector, coverage tier selector, estimate result display)
- Azure API Management (APIM) as the sole API gateway and policy enforcement point
- Estimator microservice (Node.js or Spring Boot) performing cost-sharing logic on synthetic data
- Synthetic data layer (in-memory or lightweight managed store) backing all estimates
- Azure Front Door with Web Application Firewall (WAF) for external ingress protection
- Azure Key Vault and managed identity for secretless service configuration
- Centralized telemetry (App Insights / Log Analytics) with PII-safe logging
- Compliance disclaimer logic and validation on every estimate result
- User flows: cost estimate, tier comparison, unsupported procedure guidance, resilience/error handling

### Out of Scope
- Real-time claims adjudication or live benefits/claims API integration (future phase)
- Any form of member authentication or identity verification in Phase 1
- Persistence of PII or member profile data
- Integration with enterprise on-prem systems (future phase only)
- Redis caching layer (benchmark-gated; not activated in Phase 1)
- Service Bus asynchronous integration (future phase only)
- Appeal or dispute initiation from the estimator

---

## 4. Architecture Summary

The system follows a layered, independently deployable architecture with clear trust boundaries at each tier:

```
Browser
  └─► Azure Front Door + WAF            (external ingress; DDoS protection, OWASP CRS)
        └─► Azure API Management         (rate limiting, policy enforcement, method/path restriction)
              └─► Estimator Microservice  (input validation, cost-sharing logic, PII-free responses)
                    └─► Synthetic Data Layer   (in-memory; no external data store in Phase 1)
                          └─► Key Vault / App Insights  (secrets + telemetry via managed identity)
```

**Major components:**

| Component | Technology | Hosting |
|---|---|---|
| UI | React / Node | Azure App Service or Container Apps |
| API Gateway | Azure API Management | APIM (managed service) |
| Estimator Service | Node.js or Spring Boot | Azure App Service or Container Apps |
| Synthetic Data | In-memory dataset | Co-located with Estimator Service |
| Edge / WAF | Azure Front Door + WAF | Azure managed |
| Secrets Management | Azure Key Vault | Platform managed (HSM-backed) |
| Observability | App Insights + Log Analytics | Azure managed |

**External dependencies (Phase 1):** None. The estimator is fully self-contained with synthetic data. No enterprise claims, benefits, or adjudication APIs are invoked.

**Trust boundaries:**
1. Internet → Front Door/WAF (untrusted → perimeter)
2. Front Door → APIM (perimeter → internal control plane)
3. APIM → Estimator Service (internal gateway → service trust zone)
4. Estimator Service → Synthetic Data (service → local in-process data; no network hop)
5. Services → Key Vault / App Insights (internal → platform services via managed identity)

Reference architecture diagram: [Miro board](https://miro.com/app/board/uXjVGxhZwqE=/?focusWidget=3458764663620342855)
Source file: `40-architecture/architecture-diagram.mmd`

---

## 5. Data & Trust Boundaries

| Item | Description |
|---|---|
| Sensitive Data | **Phase 1: None.** No PII is collected, stored, or transmitted. Inputs are limited to procedure code (from an approved allowlist) and coverage tier selection (enum). Outputs are estimate amounts and required disclaimer text only. |
| Data Classification | Public / functional: procedure list, coverage tiers, cost estimate amounts. No PHI, PII, or financial account data in scope for Phase 1. |
| Authentication Boundary | **Phase 1: None at the member layer.** Coverage tier is self-selected with no identity verification. APIM-to-service calls are governed by APIM subscription key policy. Service-to-platform access uses managed identity exclusively. [ASSUMPTION: No member auth is an accepted demo-phase risk; production phases must introduce member authentication.] |
| Authorization Boundary | APIM enforces API key/subscription validation for all API calls. Estimator service uses managed identity with minimum-scope Key Vault and App Insights access. No role-based member authorization in Phase 1. |
| External Integrations | **Phase 1: None.** No enterprise claims, benefits, or third-party APIs are called. The synthetic dataset is self-contained within the estimator service. |
| Data in Transit | All traffic enforces HTTPS/TLS 1.2+ at Front Door and APIM. No plain-text channels exist in the Phase 1 architecture. |
| Data at Rest | Synthetic data is in-memory with no persistent write path. Key Vault encrypts secrets using Azure-managed HSM-backed keys. Log Analytics retains telemetry; PII-scrub rules must be validated before activation. |

---

## 6. Security Controls (Minimum Required)

### Identity & Access
- **Authentication:** No end-user authentication in Phase 1 (accepted demo-phase scope, documented in Open Risks). APIM validates API subscription keys for all inbound service calls. Service-to-platform access (Key Vault, App Insights) uses managed identity exclusively — no credentials in code or configuration.
- **Authorization:** Estimator service holds read-only access to synthetic data (in-process, no network). Managed identity is scoped to the minimum required Key Vault secret read and App Insights write permissions. APIM policy restricts HTTP methods and path patterns to the estimator API contract only.
- **Principle of Least Privilege:** Managed identity has no subscription-level permissions. Key Vault access policy grants only `secret/get` on the specific named secrets required by the service. No developer or service account has standing write access to production Key Vault.

### Data Protection
- **Encryption in transit:** TLS 1.2 minimum enforced at Azure Front Door. APIM enforces HTTPS-only inbound policy. All APIM-to-service backend calls use HTTPS. No HTTP allowance or plain-text redirect vulnerabilities accepted.
- **Encryption at rest:** Synthetic in-memory dataset contains no sensitive data (no encryption requirement). Key Vault uses Azure-managed HSM-backed keys. Log Analytics retention is governed by platform-level encryption. No member data is written to persistent storage in Phase 1.

### Application & API Security
- **Input validation:** Estimator service validates that `procedureCode` is a member of the approved common-procedure allowlist and that `coverageTier` matches one of the three accepted enum values (`preventive`, `basicRestorative`, `majorRestorative`) before any calculation executes. Invalid inputs are rejected with a safe HTTP 400 response. Raw input is never reflected in error messages.
- **Error message safety:** Internal error codes, stack traces, and service metadata are never returned to the UI layer. User-safe, generic error messages are used for all client-facing error states (per UX Flow 4: Resilience and Status Communication).
- **Rate limiting:** APIM enforces per-subscription request rate limits to protect estimator service capacity. [GAP: Specific thresholds must be defined and validated against load test results before demo deployment — see R2.]
- **WAF rules:** Azure Front Door WAF is configured with the OWASP Core Rule Set (CRS). Rules covering SQL injection, cross-site scripting (XSS), path traversal, and scanner / bot detection must be validated as active before deployment.
- **Logging & monitoring:** All inbound requests and outbound responses are logged in App Insights and Log Analytics. A PII logging allowlist must be enforced in service middleware to prevent accidental capture of URL query parameters, free-text fields, or response payloads that could contain user-entered values. [GAP: PII-scrub rule implementation must be confirmed before demo go-live — see R4.]
- **Dependency management:** Third-party library dependencies for UI (npm) and service (npm/Maven) must be scanned with an SCA/SBOM-aware tool before release. [GAP: Dependency scanning pipeline is not yet established — see R5.]
- **CORS policy:** APIM must enforce a strict CORS allowlist limited to the known deployed UI origin. Wildcard origins (`*`) are not permitted.

### Resilience Controls (Security-Adjacent)
- WAF blocks malformed and oversized requests before they reach the APIM boundary.
- APIM absorbs retry storms and volume spikes through rate limiting.
- Service-side input validation prevents malformed requests from executing calculation logic.
- Stateless service design eliminates session-state attack surface and simplifies blast-radius containment.

---

## 7. Threat Snapshot (STRIDE)

| STRIDE Category | Risk | Mitigation |
|---|---|---|
| Spoofing | Caller impersonates a trusted APIM client to invoke estimator endpoints directly or bypass gateway controls. | APIM subscription key validation required for all API access. Managed identity for service-to-platform calls eliminates shared credential impersonation risk. [Phase 1 accepts no end-user identity; compensating controls are WAF and rate limiting.] |
| Tampering | Attacker submits manipulated `procedureCode` or `coverageTier` values to force unexpected calculation paths, trigger internal errors, or probe synthetic data structure. | Strict server-side enum and allowlist validation in estimator service. APIM request schema policy before call reaches service. Frontend-only validation is never treated as sufficient. |
| Repudiation | No audit trail for anomalous or abusive estimate traffic, making incident investigation or abuse detection impossible. | App Insights logs all requests with timestamps, paths, and response codes. Log Analytics provides a retention-backed audit trail. WAF logs capture edge-level block events and anomalies. |
| Information Disclosure | Error responses, logs, or debug output expose internal service structure, stack traces, calculated values beyond what the UI renders, or unintended member data. | Generic user-safe error messages enforced by service middleware. PII logging allowlist blocks sensitive field names from telemetry. WAF filters scanner probes and path traversal attempts. No PII is present in Phase 1 to disclose. |
| Denial of Service | High-volume repeated estimate requests exhaust service capacity or degrade P95 < 300ms performance SLA. Tier-toggle bursts from client-side debouncing failures also a risk. | Azure Front Door DDoS protection and WAF volume controls. APIM rate limiting per subscription key. Stateless in-memory service minimizes compute cost per request. Client-side debouncing on tier toggle (UX Flow 2). |
| Elevation of Privilege | Attacker exploits a misconfigured APIM route or exposed service endpoint to invoke admin, debug, or configuration operations not intended for public exposure. | APIM policy restricts allowed HTTP methods and path patterns to the estimator API contract only. Estimator service exposes no administrative, debug, or configuration endpoints. Managed identity is scoped to minimum required permissions with no subscription-level roles. |

---

## 8. OWASP Alignment

| OWASP Risk | Relevance | Mitigation |
|---|---|---|
| A01 Broken Access Control | Phase 1 has no member authentication. APIM API access is gated by subscription key only. No user-scoped resources exist. | APIM subscription key enforcement. HTTP method restriction via APIM policy. CORS origin allowlist. No member-scoped endpoints in Phase 1. |
| A02 Cryptographic Failures | No sensitive data in Phase 1; TLS configuration at Front Door and APIM is the primary cryptographic risk surface. | TLS 1.2+ enforced at all inbound and outbound channels. No plain-text fallback accepted. Key Vault for secret storage; Azure-managed HSM keys. |
| A03 Injection | `procedureCode` and `coverageTier` API inputs are potential injection vectors if passed unsanitized to calculation logic, log output, or future dynamic queries. | Server-side allowlist validation before any logic executes. WAF CRS rules active for injection patterns. No dynamic query construction from user input in Phase 1. |
| A05 Security Misconfiguration | WAF rules not tuned, APIM wildcard CORS policy, permissive Key Vault access, or default error pages exposing stack traces. | WAF CRS validation required before deployment. APIM CORS restricted to UI origin. Key Vault access policy reviewed and scoped per principle of least privilege. Error response safety enforced in service middleware. |
| A06 Vulnerable & Outdated Components | npm (UI) and npm/Maven (service) transitive dependency vulnerabilities are not systematically identified or remediated. | [GAP] SBOM/SCA scanning pipeline not yet established. Must be added to CI pipeline before release candidate build. |
| A07 Identification & Authentication Failures | No end-user authentication in Phase 1 is an accepted, documented risk. APIM caller authentication via subscription key is in scope and enforced. | APIM subscription key required for all API access. Phase 1 risk acceptance documented in Open Risks (R1). Production phases require member identity and authentication. |
| A09 Security Logging & Monitoring Failures | Service logs may capture user-entered procedure text, response payloads, or tier selections if PII-scrub rules are absent or incomplete. | PII logging allowlist enforced in service middleware. App Insights sampling configured. Alerting on WAF block events and APIM 4xx error spikes. Log content audited before demo deployment. |

---

## 9. Zero Trust Alignment

| Zero Trust Principle | Implementation |
|---|---|
| Verify Explicitly | Every inbound API request is validated at APIM against: subscription key validity, allowed HTTP method, and permitted path pattern. WAF validates and filters traffic at the network edge before it enters the APIM boundary. Managed identity eliminates credential-based implicit trust for all service-to-platform access. |
| Least Privilege Access | Managed identity is granted only the minimum Key Vault `secret/get` scope and App Insights write permissions needed for operation. No standing admin access to production infrastructure is permitted. APIM policy restricts the estimator API to its defined contract surface — no extra routes, methods, or endpoints are exposed. |
| Assume Breach | WAF and APIM rate limiting limit the blast radius of a compromised or abused client key. Stateless service design prevents lateral movement through session state. PII logging allowlist limits data exposure in the event of log exfiltration. Telemetry provides anomaly detection signals for abnormal request patterns. All error handling uses generic user-safe messages, preventing internal structure disclosure that could assist a follow-on attack. |

---

## 10. Open Risks & Decisions

| # | Risk | Severity | Owner | Status |
|---|---|---|---|---|
| R1 | **No member authentication in Phase 1.** Estimator endpoint is publicly accessible with only APIM subscription key as access control. No member identity binding exists. | Medium | Product / Security | Accepted for demo phase. Compensating controls: WAF, rate limiting, no PII in scope. Must be revisited before production launch. |
| R2 | **APIM rate limit thresholds undefined.** Per-subscription request rate limits have not been set or validated against load test results aligned to P95 < 300ms target. | Medium | Engineering / Cloud Ops | Open. Define and test thresholds before demo deployment. |
| R3 | **WAF CRS policy activation and tuning not confirmed.** OWASP Core Rule Set activation status and rule tuning for estimator API traffic have not been formally verified. | Medium | Cloud Ops / Security | Open. WAF validation is a required gate before go-live. |
| R4 | **PII logging allowlist not confirmed implemented.** Service middleware PII-scrub rules are planned but not verified as implemented or tested against actual log output. | High | Engineering | Open. Blocking for go-live. Confirm implementation and conduct structured log audit before demo deployment. |
| R5 | **No SBOM/SCA dependency scanning.** Transitive dependency vulnerabilities in UI (npm) and service (npm/Maven) are not systematically identified or tracked. | Medium | Engineering | Open. Establish SCA scan in CI pipeline before release candidate. |
| R6 | **Compliance disclaimer language not yet approved.** Legal/compliance review of disclaimer copy is outstanding. Members may misinterpret estimate as guaranteed benefit. | High (Compliance) | Legal / Product | Open. Required before any external-facing demo. Legal review gate must be confirmed before release. |
| R7 | **CORS allowlist not confirmed.** APIM CORS policy origin value must match the deployed UI hostname exactly. Wildcard origin risk if not explicitly configured after deployment URL is known. | Low | Engineering | Open. Confirm APIM CORS policy value after UI deployment URL is assigned. |

---

## 11. Approval and Sign-Off

| Reviewer Role | Reviewer | Decision | Target Environment | Conditions | Due Date | Status |
|---|---|---|---|---|---|---|
| Security Leadership | TBD | In Review | Development | Validate R4 with audit evidence | 2026-03-20 | Open |
| Legal or Compliance Leadership | TBD | In Review | UAT | Approve disclaimer language for R6 | 2026-03-22 | Open |

Required approval artifacts:
- Workflow: 60-approvals/templates/APPROVAL-WORKFLOW.md
- Decision register: 60-approvals/records/APPROVAL-DECISIONS.md
- Security checklist: 60-approvals/templates/SECURITY-REVIEW-CHECKLIST.md
- Compliance checklist: 60-approvals/templates/COMPLIANCE-REVIEW-TEMPLATE.md

Environment promotion rule for SSD:
- Development, Staging, UAT: Approved or Approved with conditions
- Production: Approved unless formal exception is approved by Architecture and Security leadership

---

## 12. Appendix: Security Traceability

| Security Control | Source |
|---|---|
| WAF + Front Door | ADD — Security Requirements |
| APIM policy enforcement | ADD — Security Requirements; ADD — Architecture Summary |
| Managed identity + Key Vault | ADD — Security Requirements |
| PII-safe logging (allowlist) | ADD — Security Requirements; PRD — FR-7, NFR |
| Synthetic-only data enforcement | PRD — FR-7, FR-8; PRD — NFR (Privacy) |
| Performance target P95 < 300ms | PRD — NFR (Performance) |
| Input validation (procedure/tier allowlist) | PRD — FR-1, FR-2; ADD — API contract |
| Disclaimer visibility on all results | PRD — FR-4, FR-5; UX Flow 1, Flow 2 |
| User-safe error messages | UX Flows 3, 4 — Error Handling |
| No unauthenticated PII path | PRD — FR-7; ADD — Phase 1 constraints |
| CORS allowlist at APIM | ADD — Security Requirements |

---

*This document was generated with AI assistance. All controls are traceable to provided inputs (PRD, ADD, UX Flows). Items labeled [ASSUMPTION] or [GAP] require human review before security sign-off.*
