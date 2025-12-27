import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test.beforeEach(({ }, testInfo) => {
        testInfo.setTimeout(90000);
    });

    test.describe('Login Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
        });

        test('should show validation errors for empty fields', async ({ page }) => {
            // Wait for hydration
            await page.waitForLoadState('networkidle');
            await page.getByRole('button', { name: /Sign In/i }).click();
            await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
            await expect(page).toHaveURL(/.*login/);
        });

        test('should show error for invalid credentials', async ({ page }) => {
            await page.getByLabel(/Email/i).fill('wrong@user.com');
            await page.getByLabel(/Password/i).fill('wrongpass');
            await page.getByRole('button', { name: /Sign In/i }).click();

            // Toast or error verification
            await expect(page).not.toHaveURL(/.*dashboard/);
        });
    });

    test.describe('Signup Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/signup');
        });

        test('should validate password length', async ({ page }) => {
            await page.getByLabel(/Email/i).fill('new@user.com');
            await page.getByLabel(/Password/i).fill('123'); // Too short

            // "Create Account"
            await page.getByRole('button', { name: /Create Account/i }).click();

            await expect(page).toHaveURL(/.*signup/);
        });

        test('should require hospital name', async ({ page }) => {
            await page.getByLabel(/Email/i).fill('new@user.com');
            await page.getByLabel(/Password/i).fill('ValidPass123!');

            // Hospital Label
            // Expect "Hospital / Clinic Name" to be present
            await expect(page.getByText(/Hospital \/ Clinic Name/i)).toBeVisible();

            // Leave it empty and submit
            await page.getByRole('button', { name: /Create Account/i }).click();

            await expect(page).toHaveURL(/.*signup/);
        });
    });
});
