import { test, expect } from "@playwright/test";

test("shows validation error for invalid treatment amount", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Treatment Cost").fill("0");
  await page.getByLabel("Coverage Percentage").fill("80");
  await page.getByRole("button", { name: "Estimate Cost" }).click();

  await expect(page.getByRole("alert")).toHaveText("Please enter valid values.");
  await expect(page.getByText("Plan Pays")).not.toBeVisible();
  await expect(page.getByText("Member Pays")).not.toBeVisible();
});