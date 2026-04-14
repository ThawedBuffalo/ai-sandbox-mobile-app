import { Router } from "express";

interface EstimateRequest {
  billedAmount: number;
  coveragePercent: number;
}

export const estimateRouter = Router();

estimateRouter.post("/estimate", (req, res) => {
  const payload = req.body as Partial<EstimateRequest>;

  const billedAmount = Number(payload.billedAmount);
  const coveragePercent = Number(payload.coveragePercent);

  if (!Number.isFinite(billedAmount) || billedAmount <= 0) {
    return res.status(400).json({ error: "billedAmount must be a positive number" });
  }

  if (!Number.isFinite(coveragePercent) || coveragePercent < 0 || coveragePercent > 100) {
    return res.status(400).json({ error: "coveragePercent must be between 0 and 100" });
  }

  const planPays = Number(((billedAmount * coveragePercent) / 100).toFixed(2));
  const memberPays = Number((billedAmount - planPays).toFixed(2));

  return res.json({
    planPays,
    memberPays,
  });
});
