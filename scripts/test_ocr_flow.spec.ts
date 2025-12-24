
import { test, expect } from '@playwright/test';
import path from 'path';

test('Verify OCR Workflow', async ({ page }) => {
    // 1. Navigate to Pre-Auth Page
    await page.goto('http://localhost:3000/preauth');

    // 2. Upload the Test Image
    const fileInput = await page.locator('input[type="file"]');
    const imagePath = path.resolve(__dirname, '../public/ocr_test_sample.png');
    await fileInput.setInputFiles(imagePath);

    // 3. Wait for OCR to complete (Loading spinner disappears or text appears)
    // The app shows "Click to upload" initially, and then a spinner. 
    // We check for the text area value to change.

    const textarea = page.locator('textarea[placeholder="Parsed content will appear here..."]');

    // Wait for the text "Tooth #19" which we know is in the image
    await expect(textarea).toContainText('Tooth #19', { timeout: 15000 });
    await expect(textarea).toContainText('Full coverage crown', { timeout: 15000 });

    // 4. Verify that it detected "Tooth #19"
    console.log('✅ OCR verified: Found "Tooth #19" in extracted text.');
});
