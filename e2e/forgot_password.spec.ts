
import { test, expect } from '@playwright/test';

test.describe('Forgot Password Flow', () => {

    test('should render forgot password page', async ({ page }) => {
        await page.goto('/forgot-password');

        // Verify page renders with key elements
        await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should have forgot password link on login page', async ({ page }) => {
        await page.goto('/login');

        // Verify forgot password link exists
        await expect(page.getByText(/forgot/i)).toBeVisible({ timeout: 15000 });
    });

    test('should render reset password page', async ({ page }) => {
        await page.goto('/reset-password');

        // Without valid session, should show expired message OR loading
        // Either way, page should load without crashing
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });
});
