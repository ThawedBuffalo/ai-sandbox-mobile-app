import { test, expect } from "@playwright/test";

test("cost estimator basic flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dental Cost Estimator" })).toBeVisible();

  await page.getByLabel("Treatment Cost").fill("1200");
  await page.getByLabel("Coverage Percentage").fill("80");
  await page.getByRole("button", { name: "Estimate Cost" }).click();

  await expect(page.getByText("Plan Pays")).toBeVisible();
  await expect(page.getByText("Member Pays")).toBeVisible();
});
