# Architecture Diagram

## Scope
- Product: Dental Procedure Cost Estimator
- Scope baseline: Cost estimator PRD and UX user flows
- Phase 1 constraints: synthetic data only, no PII persisted, no live enterprise API calls

## Diagram Source
```mermaid
flowchart LR
  User["Member Browser"] --> FD["Azure Front Door + WAF"]
  FD --> UI["UI App (React/Node)\nApp Service or Container Apps or AKS"]
  FD --> APIM["Azure API Management\nAuth + Policy + Versioning"]

  subgraph Phase1["Phase 1 Demo (Synthetic Only)"]
    APIM --> Svc["Estimator Service\nNode.js or Spring Boot"]
    Svc --> Synth["Synthetic Rules and Cost Dataset\nIn-Memory or Managed Store"]
    Svc --> KV["Azure Key Vault + Managed Identity"]
    Svc --> Obs["Application Insights / Log Analytics\nPII Scrubbed"]
    Svc --> Cache["Azure Cache for Redis (Optional)"]
  end

  subgraph Future["Future Enterprise Integration Path"]
    Svc -. "Future phase" .-> Bus["Azure Service Bus\nRetry + DLQ"]
    Svc -. "Future phase" .-> Data["Azure SQL / PostgreSQL"]
    Bus -. "Future phase" .-> OnPremAPI["On-Prem APIs / Systems"]
    Svc -. "Controlled sync access (future only)" .-> OnPremDB["On-Prem Databases"]
    ER["ExpressRoute / VPN"] --- OnPremAPI
    ER --- OnPremDB
  end

  classDef edge fill:#fff1df,stroke:#ff8c00,color:#7a3e00;
  classDef app fill:#e6f2fb,stroke:#0078d4,color:#0b2e4f;
  classDef infra fill:#e6f2fb,stroke:#0078d4,color:#0b2e4f;
  classDef data fill:#e7f6e7,stroke:#107c10,color:#0f4a0f;
  classDef observe fill:#efe7fb,stroke:#8661c5,color:#40206b;

  class User,FD edge;
  class UI,Svc app;
  class APIM,ER,Bus,Cache infra;
  class Data,Synth,OnPremAPI,OnPremDB data;
  class KV,Obs observe;
```

## Notes
- UI hosting is independent from service hosting and can run on App Service, Container Apps, or AKS.
- Phase 1 estimate processing uses synthetic data only and does not call live enterprise dependencies.
- API ingress is governed by APIM, and internet edge is protected by Front Door plus WAF.
- Future enterprise integration path is explicit and clearly marked as future-phase only.
- Redis remains optional and should be introduced only if benchmark evidence supports it.
- Observability and secrets management are centralized through App Insights/Log Analytics and Key Vault with managed identity.
- Miro MCP publication is limited to generic diagram shapes, so Azure service icons must be added manually in Miro if exact iconography is required.
