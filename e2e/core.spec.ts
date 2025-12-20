
import { test, expect } from '@playwright/test';

test.describe('Core Workflows', () => {
    test('landing page has correct branding', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/ARM/);
        // Check for the brand name in the navigation
        await expect(page.locator('nav').getByText('ARM')).toBeVisible();

    });

    test('landing page leads to signup', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Get Started' }).click();
        await expect(page).toHaveURL(/\/signup/);
    });
});
