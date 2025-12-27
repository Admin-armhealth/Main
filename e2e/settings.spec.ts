
import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
    test.beforeEach(async ({ page }) => {
        // Relative URL relying on baseURL
        await page.goto('/login');
        await page.getByLabel(/Email/i).fill('test@test.com');
        await page.getByLabel(/Password/i).fill('password123');
        await page.getByRole('button', { name: /Sign In/i }).click();
        await page.waitForURL('**/dashboard');
        await page.goto('/settings');
    });

    test('should render profile settings', async ({ page }) => {
        await expect(page.getByText(/Profile/i)).toBeVisible();
        await expect(page.getByLabel(/Full Name/i)).toBeVisible();
    });
});
