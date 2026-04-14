---
name: cloud-design-patterns
description: 'Cloud design patterns for distributed systems architecture covering 42 industry-standard patterns across reliability, performance, messaging, security, and deployment categories. Use when designing, reviewing, or implementing distributed system architectures.'
---

# Cloud Design Patterns

Architects design workloads by integrating platform services, functionality, and code to meet both functional and nonfunctional requirements. To design effective workloads, you must understand these requirements and select topologies and methodologies that address the challenges of your workload's constraints. Cloud design patterns provide solutions to many common challenges.

System design heavily relies on established design patterns. You can design infrastructure, code, and distributed systems by using a combination of these patterns. These patterns are crucial for building reliable, highly secure, cost-optimized, operationally efficient, and high-performing applications in the cloud.

The following cloud design patterns are technology-agnostic, which makes them suitable for any distributed system. You can apply these patterns across Azure, other cloud platforms, on-premises setups, and hybrid environments.

## How Cloud Design Patterns Enhance the Design Process

Cloud workloads are vulnerable to the fallacies of distributed computing, which are common but incorrect assumptions about how distributed systems operate. Examples of these fallacies include:

- The network is reliable.
- Latency is zero.
- Bandwidth is infinite.
- The network is secure.
- Topology doesn't change.
- There's one administrator.
- Component versioning is simple.
- Observability implementation can be delayed.

These misconceptions can result in flawed workload designs. Design patterns don't eliminate these misconceptions but help raise awareness, provide compensation strategies, and provide mitigations. Each cloud design pattern has trade-offs. Focus on why you should choose a specific pattern instead of how to implement it.

---

## Role Guidance

### Architect
- Use patterns to drive workload topology decisions in the ADD.
- Apply reliability, performance, and architecture patterns during system design.
- Document pattern selection rationale and trade-offs in the ADD.
- Map selected patterns to Well-Architected Framework pillars.
- Reference [Best Practices & Pattern Selection](references/best-practices.md) for guidance on combining patterns.
- Reference [Architecture & Design Patterns](references/architecture-design.md) for system boundary and gateway decisions.
- Reference [Azure Service Mappings](references/azure-service-mappings.md) to align patterns with Azure services.

### Reviewer
- Validate that the ADD explicitly identifies patterns used and justifies each choice.
- Check that reliability patterns (Circuit Breaker, Retry, Bulkhead) are present for all external dependencies.
- Confirm security patterns (Federated Identity, Valet Key) address authentication and access concerns.
- Verify deployment patterns align with the target environment strategy.
- Flag unaddressed failure modes that a known pattern would mitigate.
- Reference [Best Practices & Pattern Selection](references/best-practices.md) for review criteria.

### Development
- Apply patterns during implementation, not as an afterthought.
- Choose the correct pattern for the constraint being addressed (e.g., Retry for transient failure, Circuit Breaker for cascading failure prevention).
- Implement idempotency wherever message or event processing patterns are used.
- Reference messaging patterns for service-to-service communication design.
- Validate implementation matches the pattern's intent — not just structural shape.

### Deployment & Operations
- Apply deployment patterns (Deployment Stamps, External Configuration Store, Geode) when planning infrastructure.
- Use Health Endpoint Monitoring pattern to define readiness and liveness probes.
- Implement External Configuration Store pattern to separate configuration from deployment packages.
- Monitor pattern-specific operational metrics (circuit breaker state, retry rates, cache hit ratio, queue depth).
- Reference [Deployment & Operational Patterns](references/deployment-operational.md) for infrastructure management and geo-distribution decisions.

---

## Pattern Categories at a Glance

| Category | Patterns | Focus |
|---|---|---|
| Reliability & Resilience | 9 patterns | Fault tolerance, self-healing, graceful degradation |
| Performance | 10 patterns | Caching, scaling, load management, data optimization |
| Messaging & Integration | 7 patterns | Decoupling, event-driven communication, workflow coordination |
| Architecture & Design | 7 patterns | System boundaries, API gateways, migration strategies |
| Deployment & Operational | 5 patterns | Infrastructure management, geo-distribution, configuration |
| Security | 3 patterns | Identity, access control, content validation |
| Event-Driven Architecture | 1 pattern | Event sourcing and audit trails |

---

## References

| Reference | When to load |
|---|---|
| [Reliability & Resilience Patterns](references/reliability-resilience.md) | Ambassador, Bulkhead, Circuit Breaker, Compensating Transaction, Retry, Health Endpoint Monitoring, Leader Election, Saga, Sequential Convoy |
| [Performance Patterns](references/performance.md) | Async Request-Reply, Cache-Aside, CQRS, Index Table, Materialized View, Priority Queue, Queue-Based Load Leveling, Rate Limiting, Sharding, Throttling |
| [Messaging & Integration Patterns](references/messaging-integration.md) | Choreography, Claim Check, Competing Consumers, Messaging Bridge, Pipes and Filters, Publisher-Subscriber, Scheduler Agent Supervisor |
| [Architecture & Design Patterns](references/architecture-design.md) | Anti-Corruption Layer, Backends for Frontends, Gateway Aggregation/Offloading/Routing, Sidecar, Strangler Fig |
| [Deployment & Operational Patterns](references/deployment-operational.md) | Compute Resource Consolidation, Deployment Stamps, External Configuration Store, Geode, Static Content Hosting |
| [Security Patterns](references/security.md) | Federated Identity, Quarantine, Valet Key |
| [Event-Driven Architecture Patterns](references/event-driven.md) | Event Sourcing |
| [Best Practices & Pattern Selection](references/best-practices.md) | Selecting appropriate patterns, Well-Architected Framework alignment, documentation, monitoring |
| [Azure Service Mappings](references/azure-service-mappings.md) | Common Azure services for each pattern category |

---

## External Links

- [Cloud Design Patterns - Azure Architecture Center](https://learn.microsoft.com/azure/architecture/patterns/)
- [Azure Well-Architected Framework](https://learn.microsoft.com/azure/architecture/framework/)
