import request from "supertest";
import { app } from "../app";

describe("server", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns estimate response", async () => {
    const response = await request(app).post("/api/estimate").send({
      billedAmount: 1200,
      coveragePercent: 80,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      planPays: 960,
      memberPays: 240,
    });
  });

  it("rejects invalid request", async () => {
    const response = await request(app).post("/api/estimate").send({
      billedAmount: -1,
      coveragePercent: 120,
    });

    expect(response.status).toBe(400);
  });
});
