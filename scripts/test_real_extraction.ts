
// scripts/test_real_extraction.ts
// PURPOSE: Fetch the REAL Aetna CPB 0236 using Puppeteer to bypass bot detection.

import dotenv from 'dotenv';
import puppeteer from 'puppeteer';

dotenv.config({ path: '.env.local' });
process.env.AI_PROVIDER = 'openai';

const REAL_URL = "https://www.aetna.com/cpb/medical/data/200_299/0236.html";

async function runRealExtraction() {
    // Dynamic Import
    const { generateText } = await import('../src/lib/aiClient');

    console.log("🚀 STARTING REAL EXTRACTION (PUPPETEER MODE)");
    console.log("   URL:", REAL_URL);
    console.log("------------------------------------------------");

    // 1. Fetch with Puppeteer
    console.log("1️⃣  Launching Headless Browser...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Standard CI args
    });
    const page = await browser.newPage();

    // Set User Agent to look like a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log("   Going to page...");
    await page.goto(REAL_URL, { waitUntil: 'networkidle2' });

    console.log("   Extracting text...");
    // Evaluate the page content
    const textContent = await page.evaluate(() => {
        // Simple extraction: Get visible text
        return document.body.innerText.substring(0, 20000); // Grab a good chunk
    });

    await browser.close();
    console.log(`   ✅ Downloaded ${textContent.length} characters.`);
    console.log("2️⃣  Extracted Text Snippet:", textContent.substring(0, 100) + "...");

    // 3. AI Extraction
    console.log("3️⃣  AI Structuring (OpenAI)...");

    const systemPrompt = `You are an expert Clinical Policy Analyst. 
    Analyze the provided insurance policy text. 
    Extract the "Medical Necessity Criteria" into a structured list of rules.
    Be comprehensive.`;

    const userPrompt = `
    POLICY TEXT:
    ${textContent}
    
    OUTPUT FORMAT (JSON):
    {
       "policy_number": "string",
       "title": "string",
       "effective_date": "string",
       "criteria": [
          { 
            "section": "string (e.g. Lumbar Spine)", 
            "rules": ["string", "string"] 
          }
       ]
    }
    `;

    const jsonStr = await generateText({
        systemPrompt,
        userPrompt,
        temperature: 0,
        jsonMode: true
    });

    const data = JSON.parse(jsonStr);

    console.log("------------------------------------------------");
    console.log("🏁 REAL EXTRACTION RESULTS");
    console.log("------------------------------------------------");
    console.log(`Policy: ${data.policy_number} - ${data.title}`);
    console.log(`Date: ${data.effective_date}`);
    console.log(`\nFound ${data.criteria.length} Sections of Rules.`);

    data.criteria.forEach((c: any) => {
        console.log(`\n📂 SECTION: ${c.section}`);
        c.rules.forEach((r: string) => console.log(`   - ${r}`));
    });
}

runRealExtraction();
