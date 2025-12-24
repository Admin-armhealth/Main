
import { test, expect } from '@playwright/test';
import path from 'path';

test('Verify Scanned PDF OCR Workflow', async ({ page }) => {
    // Debug Console
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    // 1. Navigate
    await page.goto('/preauth');

    // 2. Upload Scanned PDF (Generated via script)
    // This PDF contains an IMAGE with text, but no selectable text layer.
    // The backend will see empty text -> return requiresOCR: true -> Frontend triggers Tesseract.

    // NO MOCKING: We trust the backend logic now.
    const fileInput = await page.locator('input[type="file"]');
    const imagePath = path.resolve(__dirname, '../public/scanned_test_sample.pdf');
    await fileInput.setInputFiles(imagePath);

    console.log('File uploaded. Checking for spinner...');

    // Check if processing started
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
    console.log('✅ Spinner visible. OCR processing started.');

    // 3. Wait for OCR
    const textarea = page.locator('textarea[placeholder="Parsed content will appear here..."]');

    // Wait for "Tooth #19" (since we reused the #19 image)
    // Increasing timeout to 120s for slow test environment downloads
    await expect(textarea).toContainText('Tooth #19', { timeout: 120000 });

    console.log('✅ scanned PDF OCR verified: Found "Tooth #19" in extracted text.');
});
