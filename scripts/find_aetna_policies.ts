
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
    console.log("🚀 Starting Aetna Policy Discovery...");
    // Launch headless:false so you can see/interact if needed (e.g. Incapsula/CAPTCHA)
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    let policies: { cpb: string, title: string, url: string }[] = [];

    try {
        // 1. Go to the main CPB health professionals page
        const entryUrl = 'https://www.aetna.com/health-care-professionals/clinical-policy-bulletins/medical-clinical-policy-bulletins.html';
        console.log(`navigating to ${entryUrl}...`);

        try {
            await page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout or error, but continuing to check content...");
        }

        console.log("   (If challenged by security/CAPTCHA, please solve it in the browser window)");

        // 2. Try to get to the Numerical List
        // The list might be directly on this page or via a link.
        console.log("   Looking for 'Numerical' link...");

        try {
            // Look for a link that matches "Numerical" (case insensitive)
            const numericalLink = page.getByRole('link', { name: /Numerical/i });
            if (await numericalLink.count() > 0 && await numericalLink.first().isVisible()) {
                console.log("   Found 'Numerical' link, clicking...");
                await numericalLink.first().click();
                await page.waitForLoadState('domcontentloaded');
            } else {
                console.log("   'Numerical' link not found. Checking if we are already on a list page or need to click 'Medical' first.");
            }
        } catch (e) {
            console.log("   Error navigating specific link:", e);
        }

        // 3. Extract Links Loop
        // We will try to extract links. If we find none, we wait a bit and try again, 
        // giving the user time to navigate if they are manually driving.

        console.log("   Starting extraction loop. Please navigate to the list of policies if not already there.");

        const MAX_ATTEMPTS = 10;
        let attempts = 0;

        while (attempts < MAX_ATTEMPTS) {
            attempts++;
            console.log(`   Attempt ${attempts}/${MAX_ATTEMPTS} to find policies...`);

            // Check if page is closed
            if (page.isClosed()) {
                console.log("   Browser page closed. Stopping.");
                break;
            }

            const currentPolicies = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('a'));
                const results: { cpb: string, title: string, url: string }[] = [];

                anchors.forEach(a => {
                    const href = a.href;
                    // pattern: .../data/1_99/0001.html OR .../data/0001.html
                    if (href && href.includes('/cpb/medical/data/') && href.endsWith('.html')) {
                        // Extract title
                        let title = a.innerText.trim();
                        if (!title) return;

                        // Extract CPB number
                        const filename = href.split('/').pop();
                        if (filename) {
                            const numPart = filename.replace('.html', '');
                            if (/^\d+$/.test(numPart)) {
                                const cpb = parseInt(numPart, 10).toString();
                                results.push({
                                    cpb: cpb,
                                    title: title,
                                    url: href
                                });
                            }
                        }
                    }
                });
                return results;
            });

            if (currentPolicies.length > 100) {
                console.log(`   ✅ Found ${currentPolicies.length} policies! This looks correct.`);
                policies = currentPolicies;
                break;
            } else {
                console.log(`   Found ${currentPolicies.length} policies so far. Waiting 3s...`);
                try {
                    await page.waitForTimeout(3000);
                } catch (e) {
                    console.log("   Wait interrupted (browser closed?).");
                    break;
                }
            }
        }

        // 4. Deduplicate and Save
        if (policies.length > 0) {
            const uniquePolicies = new Map();
            for (const p of policies) {
                if (!uniquePolicies.has(p.cpb)) {
                    uniquePolicies.set(p.cpb, p);
                }
            }
            const policyList = Array.from(uniquePolicies.values()).sort((a, b) => parseInt(a.cpb) - parseInt(b.cpb));

            console.log(`   ✅ Extracted ${policyList.length} unique policies.`);
            const manifestPath = path.resolve(__dirname, 'aetna_policy_manifest.json');
            fs.writeFileSync(manifestPath, JSON.stringify(policyList, null, 2));
            console.log(`   💾 Saved manifest to ${manifestPath}`);
        } else {
            console.log("   ❌ No policies found after attempts.");
        }

    } catch (err) {
        console.error("❌ Error during discovery:", err);
    } finally {
        try { await browser.close(); } catch (e) { }
    }
}

run();
