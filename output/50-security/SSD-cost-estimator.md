# Lightweight Security Solution Design (SSD)

**Title:** Dental Procedure Cost Estimator — Phase 1 Demo
**Status:** Draft
**Owner:** Security Team (Cyber Risk Management)
**Last Updated:** 2026-03-14

---

## 1. System Overview

The Dental Procedure Cost Estimator is a self-service, web-based tool that allows dental plan members to look up estimated out-of-pocket costs for common dental procedures before scheduling treatment. Users select a procedure and a coverage tier (preventive, basic restorative, or major restorative); the system returns a cost breakdown with plan-paid and member-responsibility amounts, backed exclusively by synthetic data in Phase 1.

**Why it exists:** Member confusion about pre-treatment costs is a top support-contact driver. Phase 1 validates the concept using synthetic data without requiring live claims or benefits API integration, protecting member data while accelerating delivery.

---

## 2. Scope

### In Scope
- React/Node UI (procedure selector, tier selector, estimate result display)
- Azure API Management (APIM) as the sole API gateway and policy enforcement point
- Estimator microservice (Node.js or Spring Boot) performing cost-sharing logic
- Synthetic data layer (in-memory or lightweight managed store) backing all estimates
- Azure Front Door with Web Application Firewall (WAF) for external ingress
- Key Vault and managed identity for secretless service configuration
- Centralized telemetry (App Insights / Log Analytics) with PII-safe logging
- Compliance disclaimer logic and validation

### Out of Scope
- Real-time claims adjudication or live benefits/claims API integration
- Any form of member authentication or identity in Phase 1
- Persistence of PII or member profile data
- Integration with enterprise on-prem systems (future phase only)
- Redis caching layer (benchmark-gated, not activated in Phase 1)
- Service Bus asynchronous integration (future phase only)

---

## 3. Architecture Summary

The system follows a layered architecture with independent deployment tiers:

```
Browser
  └─► Azure Front Door + WAF           (external ingress; DDoS, OWASP rule sets)
        └─► Azure API Management        (rate limiting, policy enforcement, auth header validation)
              └─► Estimator Microservice (input validation, cost-sharing logic, PII-free response)
                    └─► Synthetic Data Layer  (in-memory; no external data store in Phase 1)
```

**Major components:**
| Component | Technology | Hosting |
|---|---|---|
| UI | React / Node | Azure App Service or Container Apps |
| API Gateway | Azure API Management | APIM (managed) |
| Estimator Service | Node.js or Spring Boot | Azure App Service or Container Apps |
| Synthetic Data | In-memory dataset | Co-located with service |
| Edge / WAF | Azure Front Door | Azure managed |
| Secrets | Azure Key Vault | Platform managed |
| Observability | App Insights + Log Analytics | Azure managed |

**External dependencies (Phase 1):** None. The estimator is self-contained with synthetic data.

**Trust boundaries:**
1. Internet → Front Door/WAF (untrusted → perimeter)
2. Front Door → APIM (perimeter → internal control plane)
3. APIM → Estimator Service (internal gateway → service trust zone)
4. Estimator Service → Synthetic Data (service → local in-process data; no network hop)
5. Services → Key Vault / App Insights (internal → platform services via managed identity)

Reference architecture diagram: [Miro board](https://miro.com/app/board/uXjVGxhZwqE=/?focusWidget=3458764663620342855)
Source: `40-architecture/architecture-diagram.mmd`

---

## 4. Data & Trust Boundaries

| Item | Description |
|---|---|
| Sensitive Data | **Phase 1: None.** No PII is collected, stored, or transmitted. Inputs are limited to procedure code (anonymized) and coverage tier selection. Outputs are estimate amounts and disclaimer text only. |
| Data Classification | Public / functional: procedure list, coverage tiers, cost estimates. No PHI, PII, or financial account data in scope. |
| Authentication Boundary | **Phase 1: None at the member layer.** Coverage tier is self-selected with no identity verification. APIM-to-service calls are governed by APIM policy; service-to-platform uses managed identity. [ASSUMPTION: No member auth is an accepted demo-phase risk; production phases must add authentication.] |
| Authorization Boundary | APIM enforces API key or subscription validation for service calls. Internal services use managed identity with minimal Key Vault secret scope. No role-based member access in Phase 1. |
| External Integrations | **Phase 1: None.** No enterprise claims, benefits, or adjudication APIs are called. Synthetic dataset is self-contained within the estimator service. |
| Data in Transit | All traffic is HTTPS/TLS 1.2+ enforced at Front Door and APIM. No plain-text channels in scope. |
| Data at Rest | Synthetic data is in-memory; no persistent storage. Key Vault encrypts secrets at rest using Azure-managed keys. Telemetry logs are retained in Log Analytics; PII-scrub rules must be validated before activation. |

---

## 5. Security Controls

### Identity & Access
- **Authentication:** No end-user authentication in Phase 1 (accepted demo scope). APIM validates API subscription keys for inbound service calls. Services authenticate to Azure platform resources exclusively via managed identity — no credentials stored in code or configuration.
- **Authorization:** Estimator service holds read-only access to synthetic data (in-process). Managed identity is scoped to the minimum required Key Vault secrets and App Insights write access. APIM policy restricts HTTP methods and paths to the estimator endpoint contract only.
- **Least Privilege:** Managed identity has no subscription-level permissions. Key Vault access policy grants only `secret/get` on named secrets required by the service. No developer or service account has standing write access to production Key Vault.

### Data Protection
- **Encryption in transit:** TLS 1.2 minimum enforced at Front Door. APIM enforces HTTPS-only inbound policy. All backend service calls from APIM use HTTPS. No HTTP redirect vulnerabilities accepted.
- **Encryption at rest:** Synthetic in-memory dataset contains no sensitive data (no encryption requirement). Key Vault uses Azure-managed HSM-backed keys. Log Analytics retention is governed by platform encryption.

### Application & API Security
- **Input validation:** Estimator service validates that `procedureCode` belongs to the approved common-procedure list and that `coverageTier` is one of the three accepted enum values before executing any calculation. Invalid inputs are rejected with a safe 400 response. No raw input is reflected in error messages.
- **Error message safety:** Internal error codes, stack traces, and service metadata are never returned to the UI. User-safe generic messages are used for all client-facing error states (per UX Flow 4).
- **Rate limiting:** APIM enforces request rate limits per subscription key to protect estimator service capacity. Thresholds are to be defined and tested before demo deployment. [GAP: Specific rate limit thresholds have not yet been validated against load test results — see Open Risks.]
- **WAF rules:** Azure Front Door WAF is configured with OWASP Core Rule Set (CRS). Rules relevant to this API surface — SQL injection, XSS, path traversal, and scanner detection — must be validated as active before deployment.
- **Logging & monitoring:** All inbound requests and outbound responses are logged in App Insights and Log Analytics. A PII logging allowlist must be enforced in service middleware to prevent accidental inclusion of URL query parameters, free-text fields, or response payloads that could contain user-entered data. [GAP: PII-scrub rule implementation must be confirmed before demo go-live — see CXINIT2-2733.]
- **Dependency management:** Third-party library dependencies for UI and service must be scanned with a SBOM-aware tool before release. [GAP: Dependency scanning (SBOM/SCA) pipeline is not yet established for this project — see Open Risks.]
- **CORS policy:** APIM must enforce a strict CORS allowlist limited to the known UI origin. Wildcard origins (`*`) are not permitted.

### Resilience Controls (Security-Adjacent)
- WAF blocks malformed and oversized requests before they reach the service.
- APIM absorbs retry storms through rate limiting.
- Service input validation prevents malformed requests from executing calculation logic.
- Stateless service design ensures no session-state attack surface.

---

## 6. Threat Snapshot (STRIDE)

| STRIDE Category | Risk | Mitigation |
|---|---|---|
| **Spoofing** | Caller impersonates a trusted APIM client to invoke estimator endpoints. | APIM subscription key validation. Managed identity for service-to-platform calls. [Phase 1 accepts no end-user identity.] |
| **Tampering** | Attacker submits manipulated `procedureCode` or `coverageTier` values to force unexpected calculation paths or probe internal data. | Strict server-side enum validation in estimator service. APIM request schema policy. Frontend-only validation is never sufficient. |
| **Repudiation** | No audit trail exists for anomalous or abusive estimate traffic, preventing incident investigation. | App Insights logs all requests with timestamps and response codes. Log Analytics provides a retention-backed audit trail. WAF logs capture edge-level anomalies. |
| **Information Disclosure** | Error responses or logs expose internal service structure, stack traces, or unintended data. | Generic user-safe error messages enforced by service middleware. PII logging allowlist blocks sensitive field names. WAF filters scanner probes and path traversal attempts. |
| **Denial of Service** | High-volume repeated estimate requests exhaust service capacity or degrade P95 performance. | Azure Front Door DDoS protection and WAF. APIM rate limiting per subscription. Stateless, in-memory service design minimizes compute cost per request. |
| **Elevation of Privilege** | Attacker exploits a misconfigured APIM route or service endpoint to invoke an unintended backend operation. | APIM policy restricts allowed HTTP methods and paths to the estimator contract only. Estimator service exposes no administrative or configuration endpoints. Managed identity is scoped to minimum required permissions. |

---

## 7. OWASP Alignment

| OWASP Risk | Relevance | Mitigation |
|---|---|---|
| **A01 Broken Access Control** | Limited in Phase 1 (no user auth). APIM API access must be restricted to authenticated callers via subscription key. | APIM subscription key enforcement. HTTP method restrictions. CORS allowlist. |
| **A02 Cryptographic Failures** | No sensitive data in Phase 1. TLS configuration at Front Door and APIM is the primary risk surface. | TLS 1.2+ enforced at all inbound and outbound channels. No plain-text fallback. Key Vault for secret storage at rest. |
| **A03 Injection** | API inputs (`procedureCode`, `coverageTier`) could be vectors for injection if passed unsanitized to downstream logic or logs. | Server-side input validation to approved allowlists. WAF CRS rules active. No dynamic query construction from user input in Phase 1. |
| **A05 Security Misconfiguration** | WAF rules not tuned, APIM wildcard CORS, or permissive Key Vault access policies. | WAF CRS validation before deployment. APIM CORS limited to UI origin. Key Vault access policy reviewed and scoped. |
| **A06 Vulnerable & Outdated Components** | npm/Maven transitive dependency vulnerabilities in UI and service builds. | [GAP] SBOM/SCA scanning pipeline not yet established. Must be added to CI pipeline before release. |
| **A07 Identification & Authentication Failures** | No end-user authentication in Phase 1 is an accepted risk. APIM caller authentication is in scope. | APIM subscription key required for API access. Phase 1 risk acceptance documented here. Production phases require member identity. |
| **A09 Security Logging & Monitoring Failures** | Logs may capture user-entered text or response payloads containing estimate context. | PII logging allowlist enforced in service middleware. App Insights sampling configured. Alerting on WAF block events and APIM 4xx spikes. |

---

## 8. Zero Trust Alignment

| Zero Trust Principle | Implementation |
|---|---|
| **Verify Explicitly** | Every inbound API request is validated at APIM against subscription key, allowed HTTP method, and path. WAF validates requests at edge before they enter the APIM boundary. Managed identity eliminates credential-based implicit trust for service-to-platform access. |
| **Least Privilege Access** | Managed identity is granted the minimum Key Vault secret read scope and App Insights write scope. No standing admin access to production infrastructure. APIM policy restricts the estimator service to its specific API surface only. |
| **Assume Breach** | WAF and APIM rate limiting limit blast radius of a compromised or abused client. Stateless service design prevents lateral movement through session state. PII logging allowlist limits data exposure in the event of log exfiltration. Telemetry provides detection signals for anomalous request patterns. All error handling uses generic messages, preventing internal structure disclosure. |

---

## 9. Open Risks & Decisions

| # | Risk | Severity | Owner | Status |
|---|---|---|---|---|
| R1 | **Unauthenticated API in Phase 1.** Estimator endpoint is publicly accessible with only APIM subscription key protection. No end-user identity binding. | Medium | Product / Security | Accepted for demo phase. Must be revisited before production launch. Rate limiting and WAF provide compensating controls. |
| R2 | **APIM rate limit thresholds undefined.** Specific per-subscription request limits have not been configured or load-tested. | Medium | Engineering / Cloud Ops | Open. Define thresholds aligned to P95 < 300ms benchmark results. Validate before demo deployment. |
| R3 | **WAF CRS policy not yet validated.** OWASP Core Rule Set activation status and tuning for estimator API traffic pattern not confirmed. | Medium | Cloud Ops / Security | Open. WAF rule validation gate required before go-live. |
| R4 | **PII logging allowlist not implemented.** Service middleware PII-scrub rules (CXINIT2-2733) are planned but not yet confirmed as implemented or tested. | High | Engineering | Open. Blocking for go-live. Confirm implementation and run structured log audit before demo deployment. |
| R5 | **No SBOM/SCA dependency scanning.** Transitive dependency vulnerabilities in UI (npm) and service (npm/Maven) are not systematically identified. | Medium | Engineering | Open. Establish SCA scan step in CI pipeline before release candidate build. |
| R6 | **Compliance disclaimer language not yet approved.** Legal/compliance review of disclaimer copy is outstanding (see CXINIT2-2729, CXINIT2-2736 deferred). | High (Compliance) | Legal / Product | Open. Required before any external demo. Legal review gate must be confirmed before release. |
| R7 | **CORS allowlist configuration not confirmed.** APIM CORS policy origin value must match deployed UI hostname. Wildcard origin risk if not explicitly set. | Low | Engineering | Open. Confirm APIM CORS policy value after UI deployment URL is known. |

---

## Appendix: Security Traceability

| Security Control | Source |
|---|---|
| WAF + Front Door | ADD — Security Requirements |
| APIM policy enforcement | ADD — Security Requirements, Architecture Summary |
| Managed identity + Key Vault | ADD — Security Requirements |
| PII-safe logging | ADD — Security Requirements; CXINIT2-2733 (NFR) |
| Synthetic-only data enforcement | PRD — FR-7, FR-8; CXINIT2-2734 (NFR) |
| Performance target P95 < 300ms | PRD — NFR; CXINIT2-2732 (NFR) |
| Input validation (procedure/tier) | PRD — FR-1, FR-2; ADD — API contract |
| Disclaimer visibility | PRD — FR-4; CXINIT2-2729/2736 |
| User-safe error messages | UX Flows 3, 4 — Error Handling |
| No unauthenticated PII path | PRD — FR-7; ADD — Phase 1 constraints |

---

*This document was generated with AI assistance. All controls are traceable to provided inputs. Items labeled [ASSUMPTION] or [GAP] require human review before security sign-off.*
