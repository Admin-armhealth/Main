
import { test, expect } from '@playwright/test';

test('Verification Gate: Buttons disabled until checkmarks clicked', async ({ page }) => {
    test.setTimeout(180000);

    console.log('Starting Test...');
    await page.goto('/preauth');

    // Wait for hydration
    await page.waitForTimeout(5000);

    // 2. Fill Step 1 Form Manually
    const patientInput = page.getByPlaceholder('John Doe');
    await patientInput.waitFor({ state: 'visible' });
    await patientInput.fill('Test Patient');

    // Select Payer
    await page.locator('select').first().selectOption({ label: 'Aetna' });

    // Codes (Type manually if preset fails)
    // CPT
    await page.getByPlaceholder('e.g. 99213, 99214').fill('29881');

    // Notes
    await page.getByPlaceholder('Parsed content will appear here...').fill('Patient has severe knee pain. MRI shows osteoarthritis. Requesting replacement.');

    // Generate
    console.log('Generatng...');
    await page.getByRole('button', { name: 'Generate Document' }).click();

    // 3. Wait for Step 2
    await expect(page.getByText('Generated Letter Draft')).toBeVisible({ timeout: 60000 });
    console.log('Generated.');

    // 4. Verify Gate
    const saveBtn = page.getByRole('button', { name: 'Save as PDF' });
    const copyBtn = page.getByRole('button', { name: 'Copy' });

    console.log('Checking disabled state...');
    await expect(saveBtn).toBeDisabled();
    await expect(copyBtn).toBeDisabled();

    // 5. Check Boxes
    console.log('Unlocking...');
    await page.getByLabel('Verify Codes').check();
    await page.getByLabel('Verify Clinical').check();

    // Use index for the long label to be safe
    await page.locator('input[type="checkbox"]').nth(2).check();

    // 6. Verify Enabled
    await expect(saveBtn).toBeEnabled();
    await expect(copyBtn).toBeEnabled();

    console.log('SUCCESS: Verification Gate Functional');
});
