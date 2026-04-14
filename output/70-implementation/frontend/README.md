# Frontend Implementation (React + Node + Local Kubernetes)

This implementation contains:
- `ui`: React + Vite + TypeScript client app
- `server`: Node.js (Express + TypeScript) API and static hosting for built UI
- `k8s/local`: Kubernetes manifests for local pod deployment

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop
- kubectl
- kind

## Run Locally (Dev)

```bash
cd 70-implementation/frontend
npm install
npm run dev
```

- UI: `http://localhost:5173`
- Server health: `http://localhost:3001/health`

## Tests

```bash
npm test
npm run test:e2e
```

## Performance Tests (k6)

Run local k6 scenario (uses local `k6` if installed, otherwise Docker fallback):

```bash
TARGET_BASE_URL=http://127.0.0.1:8080 npm run perf:test
npm run perf:report
```

Recommended sequence after deployment:

```bash
npm run local:pipeline:deploy
npm run local:pipeline:smoke
TARGET_BASE_URL=http://127.0.0.1:8080 npm run perf:test
npm run perf:report
```

Publish performance summary to Jira story:

```bash
npm run perf:jira -- --issue-key CXINIT2-2732
```

Performance evidence files:
- `70-implementation/test-results/performance/k6-summary.json`
- `70-implementation/test-results/performance/perf-latest.md`

## Local Pipeline (One Command)

Run the full local pipeline (preflight, tests, build, image load, k8s deploy, smoke):

```bash
npm run local:pipeline
```

Run partial stages:

```bash
npm run preflight:local
npm run local:pipeline:tests
npm run local:pipeline:deploy
npm run local:pipeline:smoke
npm run local:pipeline:teardown
```

## Deployment Setup and Commands

Initial setup:

```bash
cd 70-implementation/frontend
npm install
kind create cluster --name devcon-local
```

Deploy pipeline command (recommended):

```bash
npm run local:pipeline:deploy
```

This runs: preflight, build, docker build, kind image load, k8s apply, and rollout readiness checks.

Validate deployment:

```bash
npm run local:pipeline:smoke
kubectl -n frontend-local get pods,svc
kubectl -n frontend-local port-forward svc/frontend-service 8080:80
```

Open `http://localhost:8080`.

Manual deployment commands (without pipeline wrapper):

```bash
npm run docker:build
npm run kind:load
npm run k8s:apply
npm run k8s:status
```

Pipeline reports are written to `../test-results/local-pipeline/`.

### External Skill Mapping Placeholder

This repository currently uses inferred local commands for the pipeline runner.
When `DeltaDentalPOC/local-k8s-node-postgres` is accessible, replace the command mapping inside `scripts/local-pipeline.sh` with the exact skill-native command set while keeping the same stage order.

## Build and Run Production Mode Locally

```bash
npm run build
npm run dev:server
```

## Local Kubernetes Deployment (Kind)

1. Build image:

```bash
npm run docker:build
```

2. Load image into kind cluster (`devcon-local` default):

```bash
npm run kind:load
```

3. Apply manifests:

```bash
npm run k8s:apply
npm run k8s:status
```

4. Port-forward to access app:

```bash
kubectl -n frontend-local port-forward svc/frontend-service 8080:80
```

Open `http://localhost:8080`.

## Teardown

```bash
npm run k8s:delete
```
