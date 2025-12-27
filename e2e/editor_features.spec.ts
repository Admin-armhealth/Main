
import { test, expect } from '@playwright/test';

test.describe('Editor Features', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Session
        const rnd = Math.floor(Math.random() * 10000);
        const email = `editor${rnd}@example.com`;
        await page.goto('/signup');
        await page.getByLabel(/Hospital/i).fill('Editor Clinic');
        await page.getByLabel(/First Name/i).fill('Ed');
        await page.getByLabel(/Last Name/i).fill('Itor');
        await page.getByLabel(/Email/i).fill(email);
        await page.getByLabel(/Password/i).fill('password123');
        await page.getByRole('button', { name: /Create Account/i }).click();
        await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => { });
    });

    test('should render editor actions after generation', async ({ page }) => {
        // Mock API
        await page.route('**/api/preauth', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    result: {
                        content: "# Appeal Letter\n\nThis is a mocked generated letter.",
                        metadata: {}
                    }
                })
            });
        });

        await page.goto('/preauth');

        // 1. Fill Form (Minimal to enable Generate)
        // Patient
        await page.getByPlaceholder('John Doe').fill('Test Patient');
        // Payer
        await page.locator('select').first().selectOption({ index: 1 }); // Select first option
        // Codes
        await page.getByPlaceholder('e.g. 99213, 99214').fill('99213');
        // Notes
        await page.getByPlaceholder('Parsed content will appear here...').fill('Patient needs therapy.');

        // 2. Click Generate
        await page.getByRole('button', { name: /Generate Document/i }).click();

        // 3. Wait for Editor (Step 2)
        // Look for "Generated Letter Draft" or Editor specific elements
        await expect(page.getByText('Generated Letter Draft')).toBeVisible({ timeout: 10000 });

        // 4. Verify Buttons
        await expect(page.getByRole('button', { name: /Save as PDF/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Copy/i })).toBeVisible();

        // 5. Verify Content
        await expect(page.getByText('This is a mocked generated letter')).toBeVisible();
    });
});
