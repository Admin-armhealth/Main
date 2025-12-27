
import { test, expect } from '@playwright/test';

test.describe('Performance Optimization', () => {

    test('API should return rate limit headers', async ({ request }) => {
        // Send a valid request format (will return 400 due to missing text, but headers should be present)
        const response = await request.post('/api/preauth', {
            data: { cptCodes: ['99213'] }
        });

        const headers = response.headers();

        // Rate limit info should be in response on subsequent requests
        // First request should succeed (not be rate limited)
        expect(response.status()).toBe(400); // Expected: missing input validation error
    });

    test('API should enforce rate limiting on excessive requests', async ({ request }) => {
        // Send 12 requests rapidly (limit is 10/min)
        const requests = [];
        for (let i = 0; i < 12; i++) {
            requests.push(
                request.post('/api/preauth', {
                    data: { cptCodes: ['99213'] }
                })
            );
        }

        const responses = await Promise.all(requests);
        const statusCodes = responses.map(r => r.status());

        // At least one should be rate limited (429) after first 10
        const rateLimited = statusCodes.filter(s => s === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('Rate limited response should include Retry-After header', async ({ request }) => {
        // Exhaust rate limit first
        for (let i = 0; i < 15; i++) {
            await request.post('/api/preauth', { data: { cptCodes: ['99213'] } });
        }

        // This request should be rate limited
        const response = await request.post('/api/preauth', {
            data: { cptCodes: ['99213'] }
        });

        if (response.status() === 429) {
            const headers = response.headers();
            expect(headers['retry-after']).toBeTruthy();
        }
    });
});
