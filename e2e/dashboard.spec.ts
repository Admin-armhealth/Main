
import { test, expect } from '@playwright/test';

test.describe('Dashboard - Protected Routes', () => {

    test('should redirect unauthenticated user to login', async ({ page }) => {
        // Ensure logged out or fresh context
        await page.context().clearCookies();
        await page.goto('/dashboard');
        // Expect redirect to login
        await expect(page).toHaveURL(/.*login/);
    });

    test('should redirect unauthenticated user from settings', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/settings');
        await expect(page).toHaveURL(/.*login/);
    });

    test('should redirect unauthenticated user from preauth', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/preauth');
        await expect(page).toHaveURL(/.*login/);
    });
});
