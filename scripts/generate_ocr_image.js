
const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Set content with clear, large text
    await page.setContent(`
    <html>
      <body style="background: white; font-family: Arial, sans-serif;">
        <div style="padding: 40px;">
          <h1>DENTAL IMAGING REPORT</h1>
          <p><strong>Patient:</strong> Test Patient</p>
          <p><strong>Date:</strong> 12/23/2025</p>
          <hr/>
          <h2>FINDINGS:</h2>
          <p><strong>Tooth #19:</strong> Large occlusal fracture extending to the gingiva. Recurrent decay noted.</p>
          <p><strong>Recommendation:</strong> Full coverage crown (D2740).</p>
        </div>
      </body>
    </html>
  `);

    // Take screenshot
    const outputPath = path.resolve(__dirname, '../public/ocr_test_sample.png');
    await page.screenshot({ path: outputPath });

    console.log(`Generated OCR test image at: ${outputPath}`);
    await browser.close();
})();
