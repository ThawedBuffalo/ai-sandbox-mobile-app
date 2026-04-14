export interface EstimateRequest {
  billedAmount: number;
  coveragePercent: number;
}

export interface EstimateResponse {
  planPays: number;
  memberPays: number;
}

export async function calculateEstimate(payload: EstimateRequest): Promise<EstimateResponse> {
  const response = await fetch("/api/estimate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to estimate cost");
  }

  return response.json() as Promise<EstimateResponse>;
}
