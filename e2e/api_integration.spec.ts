
import { test, expect } from '@playwright/test';

test.describe('API Integration', () => {

    test('should reject preauth request with missing text', async ({ request }) => {
        const response = await request.post('/api/preauth', {
            data: {
                // extractedText is missing
                cptCodes: ['29881']
            }
        });

        // Expect 400 or 422
        expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('should reject corrupt PDF file upload', async ({ request }) => {
        // Create a buffer with garbage data
        const buffer = Buffer.from('not a pdf content');

        const response = await request.post('/api/parse-pdf', {
            multipart: {
                file: {
                    name: 'corrupt.pdf',
                    mimeType: 'application/pdf',
                    buffer: buffer
                }
            }
        });

        // Expect handling code (400 or 500 depending on catch)
        expect(response.status()).not.toBe(200);
    });

});
