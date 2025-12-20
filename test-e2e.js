const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in fetch in Node 18+

async function runTest() {
    console.log("-----------------------------------------");
    console.log("STARTING MEDICAL AI SYSTEM DIAGNOSTIC");
    console.log("-----------------------------------------");

    const BASE_URL = 'http://localhost:3000';

    // TEST 1: Pre-Auth API (The Core Brain)
    console.log("\n[TEST 1] /api/preauth (Cardiology + Quality Score)");
    const payload = {
        extractedText: "Patient is a 65yo male with severe osteoarthritis of the left knee. X-Ray shows Kellgren-Lawrence Grade 4. Failed NSAIDs and PT for 8 weeks. Requesting Total Knee Arthroplasty.",
        cptCodes: ["27447"],
        icdCodes: ["M17.11"],
        payer: "Blue Cross",
        specialty: "Orthopedics", // Triggering Phase 4 Logic
        providerRaw: { clinicName: "Ortho Test Center", npi: "1000000000" }
    };

    try {
        const start = Date.now();
        const res = await fetch(`${BASE_URL}/api/preauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - start;

        if (res.status === 200) {
            const data = await res.json();
            console.log(`✅ Status: ${res.status} OK (${duration}ms)`);

            // Check Phase 3: Quality Score
            if (data.qualityScore !== undefined) {
                console.log(`✅ Phase 3 Active: Quality Score = ${data.qualityScore}/10`);
                console.log(`   Reasoning: ${data.qualityReasoning}`);
            } else {
                console.log(`❌ Phase 3 FAIL: No Quality Score returned.`);
            }

            // Check Phase 4: Output Content
            if (data.result && data.result.length > 100) {
                console.log(`✅ Phase 4 Active: Output Generated (${data.result.length} chars)`);
                if (data.result.includes("Orthopedics") || data.result.includes("Knee")) {
                    console.log(`✅ Phase 4 Context: 'Orthopedics' context appears to be respected.`);
                }
            } else {
                console.log(`❌ Phase 4 FAIL: Output is empty or too short.`);
            }

        } else {
            console.log(`❌ API Error: ${res.status} - ${res.statusText}`);
            const errText = await res.text();
            console.log(`   Detail: ${errText.substring(0, 200)}...`);
        }
    } catch (e) {
        console.log(`❌ CONNECTION FAIL: Make sure 'npm run dev' is running on port 3000.`);
        console.log(`   Error: ${e.message}`);
    }

    console.log("\n-----------------------------------------");
    console.log("DIAGNOSTIC COMPLETE");
    console.log("-----------------------------------------");
}

runTest();
