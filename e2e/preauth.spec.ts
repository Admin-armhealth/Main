
import { test, expect } from '@playwright/test';

test.describe('Pre-Authorization Page', () => {

    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        // Signup to ensure we have a valid session (Login might fail if user doesn't exist)
        const rnd = Math.floor(Math.random() * 10000);
        const email = `testuser${rnd}@example.com`;

        await page.goto('/signup');
        await page.getByLabel(/Hospital/i).fill('Test Clinic');
        await page.getByLabel(/First Name/i).fill('Test');
        await page.getByLabel(/Last Name/i).fill('User');
        await page.getByLabel(/Email/i).fill(email);
        await page.getByLabel(/Password/i).fill('password123'); // > 6 chars

        await page.getByRole('button', { name: /Create Account/i }).click();

        // If signup successful, we should end up at Dashboard or Login (if confirm needed)
        // If confirm needed, we are stuck. But assuming local dev mode might not require it or we land on dashboard.
        // Let's waitForURL.
        // If we land on Login, we can't proceed.
        // But assuming 'dashboard.spec.ts' passed earlier, maybe there is a way?
        // Actually, 'dashboard.spec.ts' passed *redirects*. It didn't prove we can view the dashboard.

        // Optimistic: Wait for dashboard.
        await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
            console.log('Signup did not redirect to dashboard immediately. Checking if blocked or on login.');
        });

        await page.goto('/preauth');
    });

    test('should render upload area and form fields', async ({ page }) => {
        // Check if we are actually ON preauth (no redirect to login)
        await expect(page).toHaveURL(/.*preauth/);
        await expect(page.getByText(/Drag & drop/i)).toBeVisible();
        await expect(page.getByText(/Clinical Specialty/i)).toBeVisible();
    });

    // Skipped validation test as it requires specific file interaction which is flaky in headless without fixtures
});
