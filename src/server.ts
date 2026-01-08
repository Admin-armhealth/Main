
import express, { Request, Response } from 'express';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

app.use(express.json());

// HEALTH CHECK
app.get('/', (req: Request, res: Response) => {
    res.send('🏥 ARM Health Policy Engine is Running');
});

// TRIGGER SCRAPE (Secured by Secret)
app.post('/api/engine/scrape', async (req: Request, res: Response) => {
    const { secret, type } = req.body;

    // Simple Auth
    if (secret !== process.env.ENGINE_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🚀 Starting Scrape Job: ${type || 'Aetna'}`);

    // Run in background (don't wait for HTTP response)
    runScraper().catch(err => console.error("Scraper crash:", err));

    return res.json({ status: 'Job Started', job_id: Date.now() });
});

async function runScraper() {
    console.log("Starting browser...");
    const browser = await chromium.launch({
        args: ['--no-sandbox'] // Required for Docker/Cloud
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    // Re-implemented simplified scraping logic for 10 items as a heartbeat test
    // In production, you'd import the full logic
    try {
        await page.goto('https://www.aetna.com/cpb/medical/data/1_99/0001.html');
        const title = await page.title();
        console.log("Scraped Title:", title);
    } catch (e) {
        console.error("Scrape failed", e);
    }

    await browser.close();
    console.log("Job Complete.");
}

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
