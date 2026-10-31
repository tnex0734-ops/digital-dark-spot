import { expect, test } from "@playwright/test";

test("landing to scholarship demo works with third-party requests blocked", async ({ page, baseURL }) => {
  const externalRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === baseURL) return route.continue();
    externalRequests.push(requestUrl.origin);
    return route.abort();
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find what’s missing before you decide." })).toBeVisible();
  await page.getByRole("link", { name: /Try the demo/ }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText("Illustrative demo dataset")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Possible conflict" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Important accuracy notice" })).toBeVisible();
  await page.getByRole("button", { name: "Details" }).first().click();
  const drawer = page.getByRole("dialog", { name: /Bright Path/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Close source details" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  const task = page.getByRole("checkbox", { name: /Mark Resolve: Required documents as checked/ });
  await task.check();
  await expect(page.getByText("You marked this task as checked. The evidence status has not changed.")).toBeVisible();
  await page.getByRole("button", { name: "Restart demo" }).click();
  await expect(task).not.toBeChecked();
  expect(externalRequests).toEqual([]);
});

test("demo remains usable in a narrow mobile viewport", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", (route) => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort());
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Try the demo/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: /Try the demo/ }).click();
  await expect(page.getByText("Illustrative demo dataset")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restart demo" })).toBeVisible();
});
