
import { chromium } from 'playwright';

const BASE = 'https://www.aetna.com/cpb/medical/data';

async function test() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const candidates = [
        `${BASE}/1_99/0001.html`,
        `${BASE}/1_99/1.html`,
        `${BASE}/0000_0099/1.html`,
        `${BASE}/0000_0099/0001.html`,
        `${BASE}/0001_0099/1.html`,
        `${BASE}/0001_0099/0001.html`
    ];

    console.log("🔍 Testing URL Patterns for CPB 1...");

    for (const url of candidates) {
        try {
            const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
            const status = res?.status();
            console.log(`[${status}] ${url}`);

            if (status === 200) {
                const title = await page.title();
                console.log(`   ✅ SUCCESS! Title: ${title}`);
                // Look for "Internal Error" just in case
                const body = await page.innerText('body');
                if (body.includes("Internal Error")) {
                    console.log("   ⚠️ Internal Error Page");
                } else {
                    break;
                }
            }
        } catch (e) {
            console.log(`[ERR] ${url} - ${e.message}`);
        }
    }

    await browser.close();
}

test();
