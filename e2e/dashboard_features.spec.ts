
import { test, expect } from '@playwright/test';

test.describe('Dashboard Features', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Session / Signup
        const rnd = Math.floor(Math.random() * 10000);
        const email = `dashuser${rnd}@example.com`;

        await page.goto('/signup');
        await page.getByLabel(/Hospital/i).fill('Metrics Clinic');
        await page.getByLabel(/First Name/i).fill('Metric');
        await page.getByLabel(/Last Name/i).fill('User');
        await page.getByLabel(/Email/i).fill(email);
        await page.getByLabel(/Password/i).fill('password123');
        await page.getByRole('button', { name: /Create Account/i }).click();

        await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => { });
        await page.goto('/dashboard');
    });

    test('should display metrics cards', async ({ page }) => {
        // Assert "Requests this month" or similar metrics exist
        // Based on "Goal: Verify accurate reporting and navigation"
        // We look for common dashboard text
        await expect(page.getByText(/Requests/i).first()).toBeVisible();
        await expect(page.getByText(/Approval Rate/i).first()).toBeVisible();
    });

    test('should render activity table', async ({ page }) => {
        // Even if empty, the container should exist
        // "Recent Activity"
        await expect(page.getByText(/Recent Activity/i)).toBeVisible();
    });
});
