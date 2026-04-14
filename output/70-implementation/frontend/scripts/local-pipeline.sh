#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$(cd "$ROOT_DIR/.." && pwd)/test-results/local-pipeline"
KIND_CLUSTER_NAME="${KIND_CLUSTER_NAME:-devcon-local}"
PIPELINE_MODE="${1:-full}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$REPORT_DIR/local-pipeline-$TIMESTAMP.log"
SUMMARY_FILE="$REPORT_DIR/local-pipeline-$TIMESTAMP.md"

mkdir -p "$REPORT_DIR"
cd "$ROOT_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

PASS_COUNT=0
FAIL_COUNT=0

log() {
  local level="$1"
  local message="$2"
  echo "[$(date +%H:%M:%S)] [$level] $message"
}

write_summary_header() {
  cat > "$SUMMARY_FILE" <<EOF
# Local Pipeline Report

- Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Mode: $PIPELINE_MODE
- Cluster: $KIND_CLUSTER_NAME
- Root: $ROOT_DIR
- Log: $LOG_FILE

## Stage Results

| Stage | Result |
|---|---|
EOF
}

append_stage_result() {
  local stage_name="$1"
  local stage_result="$2"
  mkdir -p "$REPORT_DIR"
  echo "| $stage_name | $stage_result |" >> "$SUMMARY_FILE"
}

finalize_summary() {
  cat >> "$SUMMARY_FILE" <<EOF

## Evidence

- E2E latest reference: test-results/.last-run.json
- Kubernetes status command: npm run k8s:status
- Skill mapping status: inferred commands are used; replace with exact local-k8s-node-postgres commands when repository access is available.
EOF

  log "INFO" "Summary written to $SUMMARY_FILE"
}

run_stage() {
  local stage_name="$1"
  shift

  log "INFO" "START stage: $stage_name"
  set +e
  "$@"
  local stage_rc=$?
  set -e

  if [[ $stage_rc -eq 0 ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    append_stage_result "$stage_name" "PASS"
    log "INFO" "PASS stage: $stage_name"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    append_stage_result "$stage_name" "FAIL (exit $stage_rc)"
    log "ERROR" "FAIL stage: $stage_name (exit $stage_rc)"
    finalize_summary
    exit $stage_rc
  fi
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR" "Missing required command: $cmd"
    return 1
  fi
}

preflight_checks() {
  require_command node
  require_command npm
  require_command docker
  require_command kubectl
  require_command kind
  require_command curl

  docker info >/dev/null 2>&1 || {
    log "ERROR" "Docker daemon is not available. Start Docker Desktop and retry."
    return 1
  }

  if ! kind get clusters | grep -Fx "$KIND_CLUSTER_NAME" >/dev/null 2>&1; then
    log "ERROR" "Kind cluster '$KIND_CLUSTER_NAME' not found. Create it with: kind create cluster --name $KIND_CLUSTER_NAME"
    return 1
  fi

  kubectl cluster-info >/dev/null 2>&1 || {
    log "ERROR" "kubectl cannot reach a Kubernetes cluster. Check your context."
    return 1
  }
}

deploy_checks() {
  kubectl -n frontend-local rollout status deployment/frontend-deployment --timeout=120s
  npm run k8s:status
}

smoke_health_check() {
  local pf_pid=""
  local local_port="${LOCAL_PIPELINE_PORT:-8080}"

  if lsof -iTCP:"$local_port" -sTCP:LISTEN >/dev/null 2>&1; then
    log "ERROR" "Local port $local_port is already in use. Set LOCAL_PIPELINE_PORT to another value."
    return 1
  fi

  kubectl -n frontend-local port-forward svc/frontend-service "$local_port:80" >> "$LOG_FILE" 2>&1 &
  pf_pid=$!

  sleep 3
  curl -fsS "http://127.0.0.1:$local_port/health" >/dev/null

  kill "$pf_pid" >/dev/null 2>&1 || true
  wait "$pf_pid" >/dev/null 2>&1 || true
}

run_tests_flow() {
  run_stage "unit-and-integration-tests" npm run test
  run_stage "e2e-tests" npm run test:e2e
}

run_deploy_flow() {
  run_stage "build" npm run build
  run_stage "docker-build" npm run docker:build
  run_stage "kind-load" npm run kind:load
  run_stage "k8s-apply" npm run k8s:apply
  run_stage "k8s-readiness" deploy_checks
}

run_smoke_flow() {
  run_stage "smoke-health" smoke_health_check
}

run_teardown_flow() {
  run_stage "k8s-delete" npm run k8s:delete
}

write_summary_header

case "$PIPELINE_MODE" in
  preflight)
    run_stage "preflight" preflight_checks
    ;;
  tests)
    run_stage "preflight" preflight_checks
    run_tests_flow
    ;;
  deploy)
    run_stage "preflight" preflight_checks
    run_deploy_flow
    ;;
  smoke)
    run_stage "preflight" preflight_checks
    run_smoke_flow
    ;;
  teardown)
    run_teardown_flow
    ;;
  full)
    run_stage "preflight" preflight_checks
    run_tests_flow
    run_deploy_flow
    run_smoke_flow
    ;;
  *)
    log "ERROR" "Unknown mode: $PIPELINE_MODE"
    log "INFO" "Supported modes: preflight, tests, deploy, smoke, teardown, full"
    exit 2
    ;;
esac

finalize_summary
log "INFO" "Pipeline completed with $PASS_COUNT passed stage(s), $FAIL_COUNT failed stage(s)."
