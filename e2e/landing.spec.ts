
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
    test.beforeEach(async ({ page }) => {
        // Use relative path to rely on baseURL (fixes localhost issues)
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should render the hero section correctly', async ({ page }) => {
        // "The Prior Authorization AI"
        await expect(page.getByText(/Prior Authorization/i)).toBeVisible();
        await expect(page.getByText(/Without HIPAA Risk/i)).toBeVisible();
    });

    test('should navigate to Signup page from CTA', async ({ page }) => {
        // Find visible link to signup
        const cta = page.locator('a[href="/signup"]').first();
        await expect(cta).toBeVisible();
        await cta.click();
        await expect(page).toHaveURL(/.*signup/);
    });

    test('should navigate to Login page', async ({ page }) => {
        const login = page.locator('a[href="/login"]').first();
        await expect(login).toBeVisible();
        await login.click();
        await expect(page).toHaveURL(/.*login/);
    });
});
