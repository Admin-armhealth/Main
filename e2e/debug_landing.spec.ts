
import { test, expect } from '@playwright/test';

test('debug landing page', async ({ page }) => {
    // Force clear cookies/storage first to avoid redirect loops
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/');

    // Log URL
    const url = page.url();
    console.log('DEBUG URL:', url);

    // Log Title
    const title = await page.title();
    console.log('DEBUG TITLE:', title);

    if (url.includes('dashboard')) {
        console.log('DEBUG WARNING: Redirected to Dashboard');
    }

    // content snippet
    const content = await page.content();
    console.log('DEBUG CONTENT (Start):', content.substring(0, 500));
    console.log('DEBUG CONTENT (Body):', await page.locator('body').innerHTML());

    // Fail if body empty or error
    await expect(page.locator('body')).not.toBeEmpty();
});
