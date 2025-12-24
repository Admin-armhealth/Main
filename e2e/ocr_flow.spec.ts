
import { test, expect } from '@playwright/test';
import path from 'path';

test('Verify OCR Workflow', async ({ page }) => {
    // Debug Console
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    // 1. Navigate to Pre-Auth Page (BaseURL is 3001)
    await page.goto('/preauth');

    // 2. Upload the Test Image
    const fileInput = await page.locator('input[type="file"]');
    const imagePath = path.resolve(__dirname, '../public/ocr_test_sample.png');
    await fileInput.setInputFiles(imagePath);

    console.log('File uploaded. Checking for spinner...');

    // Check if processing started (spinner should appear)
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
    console.log('✅ Spinner visible. OCR processing started.');

    // 3. Wait for OCR
    const textarea = page.locator('textarea[placeholder="Parsed content will appear here..."]');

    // Wait up to 60s for Tesseract download + processing
    await expect(textarea).toContainText('Tooth #19', { timeout: 60000 });
    await expect(textarea).toContainText('Full coverage crown', { timeout: 60000 });

    console.log('✅ OCR verified: Found "Tooth #19" in extracted text.');
});
