
import dotenv from 'dotenv';
import path from 'path';

// Load env BEFORE importing app code
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runPrediction() {
    // Dynamic import to ensure env vars are loaded first
    const { PolicyEngine } = await import('../src/lib/policyEngine');


    // Helper function inside scope to use PolicyEngine
    async function analyze(note: string, cptCode: string, label: string) {
        console.log(`\n🧪 Testing ${label}...`);
        console.log("------------------------------------------------");

        try {
            const result = await PolicyEngine.verify(cptCode, note);

            console.log(`STATUS: ${result.overall_status}`);

            if (result.missing_info.length > 0) {
                console.log("⚠️ Missing/Failed:", result.missing_info);
            }

            result.analysis.forEach((r: any) => {
                const icon = r.met ? '✅' : '❌';
                console.log(`   ${icon} [${r.category}]: ${r.evidence}`);
            });

        } catch (e: any) {
            console.error("Failed:", e.message);
        }
    }

    // SCENARIO 1: APPROVAL (Matches Criteria: Elevated PSA)
    // Rule in CPB-0001 usually requires PSA > 4.0 or Abnormal DRE.
    const NOTE_APPROVAL = `
    65yo male. PSA elevated at 6.4 ng/mL (confirmed). 
    Digital Rectal Exam (DRE) revealed a suspicious nodule on the left lobe.
    Requesting Transrectal Ultrasound (TRUS) guided biopsy.
    `;

    // SCENARIO 2: DENIAL (Screening only, not covered for routine)
    const NOTE_DENIAL = `
    50yo male presenting for routine screening. 
    PSA is normal (1.2). DRE is normal. No family history.
    Requesting TRUS for baseline.
    `;

    // SCENARIO 3: MISMATCH (Knee Pain vs Prostate Policy)
    const NOTE_MISMATCH = `
    65yo male. Chief complaint: "My left knee hurts".
    History of fall. Swelling on medial aspect.
    Exam: Tender joint line. Lachman negative.
    Plan: Requesting Transrectal Ultrasound (TRUS) of Prostate.
    `;

    // Using Aetna CPB-0001 Code "CPB-0001" as per the scraper logic
    const CPT_CODE = 'CPB-0001';

    await analyze(NOTE_APPROVAL, CPT_CODE, "SCENARIO 1 (Approval)");
    await analyze(NOTE_DENIAL, CPT_CODE, "SCENARIO 2 (Denial - Screening)");
    await analyze(NOTE_MISMATCH, CPT_CODE, "SCENARIO 3 (Mismatch - Knee vs Prostate)");
}


// External analyze function removed


runPrediction();
