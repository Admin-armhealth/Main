
// scripts/test_denial_predictor.ts
// PURPOSE: Simulate the "AI Referee" checking a clinical note against structured policy rules.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Load the key FIRST
process.env.AI_PROVIDER = 'openai';

const MOCK_AETNA_RULES = {
    policy_id: "CPB-0236",
    title: "MRI of the Spine",
    criteria: [
        { id: "rule_1", description: "Pain has been present for at least 6 weeks." },
        { id: "rule_2", description: "Patient has completed 4 weeks of Conservative Therapy (PT, NSAIDs, Chiro)." }
    ]
};

const SAMPLE_CLINICAL_NOTE = `
Patient: John Doe. DOS: Jan 5, 2026. 
c/o Lower back pain for 2 months. Meds: Ibuprofen. No other treatment.
`;

async function runPrediction() {
    // Dynamic Import to prevent hoisting issues
    const { generateText } = await import('../src/lib/aiClient');

    console.log("🔮 STARTING DENIAL PREDICTION ENGINE (REAL AI MODE)...");
    console.log("------------------------------------------------");
    console.log("📄 Note:", SAMPLE_CLINICAL_NOTE.trim());

    const systemPrompt = "You are a Medical Necessity Auditor. Compare the Clinical Note against the Policy Rules.";
    const userPrompt = `
    TASK: Verify if this request meets the insurance criteria.
    
    POLICY RULES (JSON):
    ${JSON.stringify(MOCK_AETNA_RULES.criteria, null, 2)}
    
    CLINICAL NOTE:
    """${SAMPLE_CLINICAL_NOTE}"""
    
    RESPONSE FORMAT (JSON):
    {
       "overall_status": "APPROVED" | "DENIED" | "MISSING_INFO",
       "analysis": [
          {
             "rule_id": "string",
             "met": boolean,
             "evidence": "string (quote from note) or 'Not found'"
          }
       ],
       "missing_info": ["list of specific things missing"]
    }
    `;

    try {
        console.log("🤖 Asking AI Referee to Analyze (Calling OpenAI)...");

        const jsonStr = await generateText({
            systemPrompt,
            userPrompt,
            temperature: 0,
            jsonMode: true
        });

        const result = JSON.parse(jsonStr);

        console.log("------------------------------------------------");
        console.log("🏁 PREDICTION RESULTS");
        console.log("------------------------------------------------");
        console.log(`STATUS: ${result.overall_status === 'APPROVED' ? '✅ APPROVED' : '❌ DENIED RISK'}`);

        if (result.missing_info && result.missing_info.length > 0) {
            console.log("\n⚠️ CRITICAL MISSING INFO:");
            result.missing_info.forEach((m: string) => console.log(`   - ${m}`));
        }

        console.log("\n🔍 DETAILED ANALYSIS:");
        result.analysis.forEach((r: any) => {
            const icon = r.met ? '✅' : '❌';
            console.log(`   ${icon} [${r.rule_id}]: ${r.evidence}`);
        });

    } catch (e: any) {
        console.error("Failed:", e.message);
    }
}

runPrediction();
