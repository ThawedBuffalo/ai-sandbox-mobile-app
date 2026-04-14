# Architecture Design Document (ADD)

## Overview
This Architecture Design Document defines the target architecture for the Dental Cost Estimator product described in the cost estimator PRD.

Phase 1 scope is demo-safe and synthetic-data-only:
- No PII is collected, stored, or transmitted.
- No live enterprise claims or benefits integrations are invoked.
- Estimates are approximate and shown with required disclaimer language.

The target architecture preserves long-term enterprise alignment:
- UI tier is hosted separately from service tiers.
- API governance is centralized through Azure API Management.
- Microservices can be implemented and deployed independently using Node.js and/or Spring Boot.

## Revision History
| Version | Date | Change Description | Author |
|---|---|---|---|
| 1.3 | 2026-03-15 | Added cloud design pattern alignment (External Configuration Store, Health Endpoint Monitoring, Static Content Hosting, Retry, Circuit Breaker, BFF), split health probe endpoints, CDN static asset delivery, container security hardening, and structured observability rules | Architecture Team |
| 1.2 | 2026-03-13 | Regenerated ADD to include explicit enterprise, application, and infrastructure principle alignment | Architecture Team |
| 1.1 | 2026-03-13 | Regenerated ADD and architecture artifacts from cost estimator PRD and user flows using ADEDIC format | Architecture Team |
| 1.0 | 2026-03-13 | Initial ADEDIC-format ADD recreation from cost estimator PRD and user flows | Architecture Team |

## Stakeholders
| Person | Title/Role | Area |
|---|---|---|
| Product Owner | Product Lead | Product |
| Architecture Team | Solution Architecture | Enterprise Architecture |
| Engineering Team | Lead Engineer | Application Development |
| Security Team | Security Architect | Cyber Risk Management |
| Cloud Operations Team | Platform Engineer | Cloud Operations |
| UX Team | UX Designer | Experience Design |

## Approval
| Date | Version | Governance Body | Approval Reference |
|---|---|---|---|
| 2026-03-14 | 1.2 | Architecture Leadership | See 60-approvals/records/APPROVAL-DECISIONS.md |

### Approval Conditions and Gates
- Required checklist: 60-approvals/templates/ARCHITECTURE-REVIEW-CHECKLIST.md
- Workflow policy: 60-approvals/templates/APPROVAL-WORKFLOW.md
- Decision register: 60-approvals/records/APPROVAL-DECISIONS.md

Traceability links are maintained in 40-architecture/architecture-links.md.

Environment promotion rule for this artifact:
- Development, Staging, UAT: Approved or Approved with conditions
- Production: Approved by default; any conditional promotion requires formal exception by Architecture and Security leadership

## Design Requirements

### Use Cases
- Member requests estimate for a supported procedure and selected coverage tier.
- Member compares estimate across coverage tiers from the result view.
- Member receives clear unsupported-procedure guidance and recovery path.
- Member receives resilient status/error messaging during transient failures.

### Functional Requirements
- Present searchable/selectable list of supported common procedures.
- Accept coverage tier selection and estimate request.
- Return member responsibility and plan-paid cost breakdown.
- Display required disclaimer text on each estimate result.
- Recalculate estimate when coverage tier changes.
- Keep UI and microservice deployments independent.
- Route API traffic through Azure API Management.

### Non-Functional Requirements
- p95 response time below 300ms for estimate requests.
- No PII in requests, storage, logs, or integrations.
- Synthetic data only in Phase 1.
- UI aligned to WCAG 2.1 AA goals.
- Replaceable data access layer for future live-data transition without UI redesign.

### Security Requirements
- Azure Front Door with WAF for external ingress protection.
- APIM policy enforcement for authentication, throttling, and request governance.
- Managed identity and Key Vault for secretless service access.
- Centralized telemetry with PII-safe logging rules.
- Private connectivity design available for future on-prem integrations.

### Terms
| Term | Definition |
|---|---|
| Frontend API | API contract used by the UI through APIM |
| Backend API | Service implementation invoked by APIM |
| APIM | Azure API Management |
| DR | Disaster Recovery |
| DLQ | Dead Letter Queue for failed asynchronous events |

## High-Level Design

### Conceptual Architecture
Architecture is organized into independent layers:
- UI Layer: React/Node UI hosted separately.
- API Control Layer: APIM in front of all backend service endpoints.
- Service Layer: Independently deployable microservices in Node.js and/or Spring Boot.
- Data Layer: Synthetic data source in Phase 1; replaceable persistence/integration adapters for future phases.

Reference architecture diagram:
- 40-architecture/architecture-diagram.mmd
- 40-architecture/architecture-diagram.md

### Deployment Architecture
Layer hosting options are evaluated and supported:
- UI: Azure Container Apps (default), Azure App Service, or AKS.
- Microservices: Azure Container Apps (default), Azure App Service, or AKS.
- Edge/Gateway: Azure Front Door + WAF and APIM.
- Platform controls: Key Vault, managed identity, App Insights/Log Analytics.

Phase 1 runtime deployment recommendation:
- UI and estimator service hosted in Azure Container Apps to accelerate demo readiness with minimal operational overhead.
- Synthetic data loaded in-memory for latency compliance.

Future enterprise deployment readiness:
- Optional Service Bus for resilient asynchronous integration.
- ExpressRoute or VPN path for on-prem integration when approved.

#### Cloud Design Patterns Applied — Deployment Layer

| Pattern | Applied Where | Rationale |
|---|---|---|
| External Configuration Store | All container environments | Non-secret config via ConfigMap/Azure App Configuration; secrets via Azure Key Vault with managed identity. Configuration separated from image at all promotion stages. |
| Health Endpoint Monitoring | UI BFF container and estimator service | Separate `/health/live` (process alive) and `/health/ready` (dependencies reachable) endpoints. Readiness gates traffic; liveness triggers restart. |
| Static Content Hosting | UI static assets (Vite output) | `ui/dist/` assets served via Azure Front Door CDN. Long-lived `Cache-Control` headers on content-hashed filenames; `no-cache` on `index.html`. |
| Deployment Stamps | Future multi-region scale-out | Each stamp is a self-contained UI + service + data deployment. Applicable when regional data residency or tenant isolation is required. Not activated in Phase 1. |

#### Container Build and Security Constraints
- Multi-stage Docker build: only compiled server and UI dist artifacts, plus `node_modules`, are copied to the runtime stage. Source files are never included.
- Runtime base image: `node:20-alpine`. Container process runs as non-root (`USER node`) to reduce attack surface.
- No secrets baked into image layers. All `SECRET_*` and connection-string values are injected at runtime via Key Vault references or orchestrator-managed env.
- Build-time `VITE_*` env vars are limited to values that are truly public and fixed per environment.

### Additional Details
- Result states align to UX flows: loading, success, validation error, retriable failure.
- Unsupported procedures return guided recovery path.
- Tier toggles are debounced and process latest request.
- Redis remains optional and benchmark-driven.

Principle alignment summary:
- Enterprise principles: enterprise-first reuse, customer-centric UX outcomes, service orientation, simplified architecture, and reliability/security by default.
- Application principles: platform-focused implementation, layered architecture, common user experience, business-boundary separation, and standards alignment.
- Infrastructure principles: cloud-first hosting preference, scalability/resilience, measured service, immutable/idempotent automation, and CI/CD-driven operations.

## Detailed Design

### Internal Frontend APIs
For Phase 1, internal frontend APIs are limited to estimator workflow operations.

| Field | Value |
|---|---|
| Display name | Cost Estimator Internal Frontend API |
| Description | Returns estimate breakdown for supported procedures and selected tiers using synthetic data |
| OpenAPI link | Not applicable in this document; maintained in source control |
| Versioning | v1 |

### External Frontend APIs
Not applicable for Phase 1.

Reason:
- Phase 1 is internal demo scope and does not publish external consumer API products.

### Web Service | Listener | Producer | Scheduled Application | ...
Primary web service responsibilities:
- Validate input for supported procedure and tier.
- Execute synthetic cost-sharing calculation logic.
- Return estimate response payload including plan-paid/member-responsibility fields.
- Enforce disclaimer presence contract to UI.
- Emit telemetry without PII.

Service interaction sequence:
1. UI submits estimate request to APIM.
2. APIM applies policy and forwards to estimator microservice.
3. Service reads synthetic rules/cost tables.
4. Service computes cost breakdown and returns response.
5. UI renders result and disclaimer.

#### Cloud Design Patterns Applied — Service and Integration Layer

| Pattern | Applied Where | Rationale |
|---|---|---|
| Retry | UI BFF → APIM calls | Transient APIM/network faults handled with exponential backoff + jitter (max 3 attempts). Non-retriable 4xx responses are not retried. |
| Circuit Breaker | UI BFF → APIM calls | Prevents cascading failure when APIM is degraded. Opens after 5 consecutive failures; enters half-open state after 30 seconds. |
| Rate Limiting | APIM policy (enforced at gateway) | APIM enforces quota and rate-limit policies. BFF propagates `429 Too Many Requests` with `Retry-After` header to the browser without swallowing it. |
| Backends for Frontends (BFF) | Node.js server layer | Single BFF origin for the browser. UI never calls APIM or microservices directly. BFF handles all API proxy, resilience, and header middleware concerns. |
| Asynchronous Request-Reply | Future long-running calculations | HTTP 202 + polling location for any estimate path that exceeds synchronous response budget. Not activated in Phase 1. |

Future integration path (not used in Phase 1):
- Optional event-based integration via Service Bus with retry and DLQ.
- Optional controlled sync adapters for enterprise dependencies with timeout/circuit-breaker policy.

#### Observability Rules
- Structured JSON logging in BFF (one log line per request): `correlationId`, `method`, `path`, `statusCode`, `durationMs`.
- `x-correlation-id` propagated from Azure Front Door / APIM through to downstream services; generated at BFF if absent.
- Telemetry exported to Azure Monitor / Application Insights via OpenTelemetry SDK or `applicationinsights` npm package.
- Request bodies containing member identifiers or dental plan details must not appear in any log output.

### Database Details
Phase 1:
- Synthetic dataset only.
- In-memory access pattern preferred for p95 target compliance.
- No PII columns, no member profile persistence, no external data writes.

Future-ready design:
- Data access abstraction allows replacement with managed relational stores.
- Connection pools and retry behavior are runtime-configurable and benchmark tuned.

### Disaster Recovery Design
Phase 1 DR intent:
- Stateless service deployment and repeatable environment provisioning.
- Rebuild synthetic dataset from source artifacts during redeploy.
- Standard backup and recovery for any managed configuration stores.

Future DR extension:
- Include APIM config recovery, service rollback patterns, and data restore playbooks.
- Validate recovery objectives as enterprise integrations are introduced.

## Appendix
Principle alignment details:
- Enterprise Value Focus + Common Use Applications:
  - Separate reusable control planes (Front Door, APIM, Key Vault, observability) reduce duplicated implementations and operational cost.
- Customer Centricity + Online Multi-Channel Experience:
  - UX flows prioritize transparent estimate outcomes, disclaimers, clear error recovery, and responsive tier comparison behavior.
- Service Orientation + Layered Architecture:
  - UI, API control, business services, and data concerns are separated with contract-based integration via APIM.
- Simplified Architecture + Fit for Purpose:
  - Phase 1 keeps synthetic data path lean, avoids unnecessary enterprise coupling, and preserves future replaceable adapters.
- Reliable/Scalable/Secure + Availability/Scalability principles:
  - Stateless service design, optional autoscaling paths, WAF, identity-first access, and continuous telemetry support non-functional goals.
- Interoperability + Standards Alignment:
  - API contracts, policy-driven gateway controls, and standards-based infrastructure patterns enable portability and controlled evolution.
- Business Continuity + Resilience:
  - DR-ready patterns, retry strategies, and future asynchronous integration options reduce outage and dependency risk.

### Cloud Design Pattern Inventory

| Pattern | Category | Status | Location |
|---|---|---|---|
| External Configuration Store | Deployment & Operational | Active — Phase 1 | All container environments |
| Health Endpoint Monitoring | Reliability & Resilience | Active — Phase 1 | UI BFF, estimator service |
| Static Content Hosting | Deployment & Operational | Active — Phase 1 | UI static assets via Front Door CDN |
| Backends for Frontends (BFF) | Architecture & Design | Active — Phase 1 | Node.js UI server layer |
| Retry | Reliability & Resilience | Active — Phase 1 | UI BFF → APIM |
| Circuit Breaker | Reliability & Resilience | Active — Phase 1 | UI BFF → APIM |
| Rate Limiting | Performance | Active — Phase 1 (at APIM) | APIM policy; BFF passthrough |
| Gateway Offloading | Architecture & Design | Active — Phase 1 | APIM: auth, throttling, logging |
| Federated Identity | Security | Planned — post-Phase 1 | Entra ID / APIM subscription keys |
| Deployment Stamps | Deployment & Operational | Future | Multi-region scale-out |
| Asynchronous Request-Reply | Performance | Future | Long-running estimate paths |
| Publisher-Subscriber | Messaging & Integration | Future | Service Bus integration |
| Saga | Reliability & Resilience | Future | Multi-step enterprise transaction flows |
- Control Technical Diversity + Prefer Buy vs Build:
  - Managed Azure platform services are preferred before custom platform engineering.
- Open Standards + Idempotency + Immutable Infrastructure + CI/CD:
  - Infrastructure and deployment paths are designed for repeatable, automated, policy-driven promotion across environments.

Tradeoffs:
- Separate UI and service hosting improves agility and scaling control but increases release coordination.
- Mixed runtime support improves fit by domain but requires strict platform standards.
- Lightweight hosting improves delivery speed; AKS remains available for advanced scaling needs.

Risks and mitigations:
- Risk: Members treat estimate as adjudication outcome.
  - Mitigation: Persistent, prominent disclaimer text on all result states.
- Risk: Synthetic model diverges from realistic benefit behavior.
  - Mitigation: Validate synthetic rules against representative plan structures.
- Risk: Performance misses p95 target under load.
  - Mitigation: Benchmark early, keep compute path in-memory, introduce cache only if justified.
- Risk: Later enterprise integration introduces redesign.
  - Mitigation: Maintain stable API contract and replaceable data/integration interfaces.
- Risk: Logs accidentally include sensitive payload details.
  - Mitigation: Enforce logging allowlist and PII-scrub rules in service middleware.
