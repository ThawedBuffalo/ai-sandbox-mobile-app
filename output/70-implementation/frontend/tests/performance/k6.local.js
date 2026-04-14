import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.TARGET_BASE_URL || "http://127.0.0.1:8080";

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
    checks: ["rate>0.99"],
  },
  scenarios: {
    health_checks: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 10, duration: "10s" },
        { target: 20, duration: "20s" },
        { target: 0, duration: "5s" },
      ],
      exec: "healthFlow",
    },
    estimate_load: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 30,
      maxVUs: 150,
      stages: [
        { target: 25, duration: "10s" },
        { target: 50, duration: "20s" },
        { target: 0, duration: "5s" },
      ],
      exec: "estimateFlow",
    },
  },
};

export function healthFlow() {
  const res = http.get(`${baseUrl}/health`);
  check(res, {
    "health status is 200": (r) => r.status === 200,
  });
  sleep(0.1);
}

export function estimateFlow() {
  const payload = JSON.stringify({
    billedAmount: 1200,
    coveragePercent: 80,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(`${baseUrl}/api/estimate`, payload, params);
  let parsed;
  if (res.status === 200) {
    parsed = res.json();
  }

  check(res, {
    "estimate status is 200": (r) => r.status === 200,
    "estimate has planPays": () => parsed !== undefined && typeof parsed.planPays === "number",
    "estimate has memberPays": () => parsed !== undefined && typeof parsed.memberPays === "number",
  });

  sleep(0.1);
}
