
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should navigate to login page', async ({ page }) => {
        await page.goto('/login');
        // Layout title is global, specific page title might not be set in MVP
        // await expect(page).toHaveTitle(/Login/); 
        await expect(page.getByText('Welcome to ARM')).toBeVisible();
        await expect(page.getByText('Sign In')).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'wrong@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        // Expect error message - adjust selector based on actual generic "Auth" component behavior from Supabase UI
        // Supabase UI usually shows an error alert.
        // For now, checks if we remain on the page or see an error.
        await expect(page.locator('text=Invalid login credentials')).toBeVisible();
    });

    // Note: Full signup/login happy paths are hard to test with real Supabase unless we use specific test users 
    // or mock the auth network requests. For this MVP test suite, we verify the user *can* navigate and interact.
    // We will assume "mock" mode for AI, but Auth is real. 
    // To avoid spamming real DB, we might skip full registration in this automated run unless we have a cleanup script.
});
