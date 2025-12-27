
import { test, expect } from '@playwright/test';

test.describe('Appeal Page', () => {

    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        // Signup Flow
        const rnd = Math.floor(Math.random() * 10000);
        const email = `appealuser${rnd}@example.com`;

        await page.goto('/signup');
        await page.getByLabel(/Hospital/i).fill('Appeal Clinic');
        await page.getByLabel(/First Name/i).fill('Test');
        await page.getByLabel(/Last Name/i).fill('User');
        await page.getByLabel(/Email/i).fill(email);
        await page.getByLabel(/Password/i).fill('password123');

        await page.getByRole('button', { name: /Create Account/i }).click();

        // Wait explicitly for dashboard, fail if not found
        await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });

        await page.goto('/appeal');
    });

    test('should render denial reason input', async ({ page }) => {
        await expect(page).toHaveURL(/.*appeal/);
        await expect(page.getByText(/Denial Reason/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Generate Appeal/i })).toBeVisible();
    });

    test('should block empty submission', async ({ page }) => {
        await page.getByRole('button', { name: /Generate Appeal/i }).click();
        await expect(page.getByText(/Please provide/i)).toBeVisible();
    });
});
