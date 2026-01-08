
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 1. Setup Environment & DB
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Force OpenAI for this test
process.env.AI_PROVIDER = 'openai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 2. Mock Data (The "Trigger")
const MOCK_REQUEST = {
    cpt_code: '76872', // Common Transrectal Ultrasound code (likely in CPB-0001)
    clinical_note: `
        Patient: 65yo Male.
        History: Elevated PSA (8.5), abnormal DRE with nodule on right lobe.
        Plan: Transrectal ultrasound guided biopsy.
        Previous imaging: None.
    `
};

async function runVerification() {
    console.log("🚀 Starting Policy Verification Prototype...");
    console.log("------------------------------------------------");
    console.log(`🔎 Input CPT: ${MOCK_REQUEST.cpt_code}`);
    console.log(`📝 Clinical Note: ${MOCK_REQUEST.clinical_note.trim().substring(0, 50)}...`);

    // 3. Retrieval (The "Lookup")
    console.log("\n1️⃣  Looking up Policy...");

    // STRATEGY: Find a policy that actually has sections (Rules)
    const { data: validPolicies, error: vpErr } = await supabase
        .from('policy_sections')
        .select('policy_id, content')
        .limit(1);

    if (vpErr || !validPolicies || validPolicies.length === 0) {
        console.error("❌ No policy sections found in DB. Run scraper.");
        return;
    }

    const targetPolicyId = validPolicies[0].policy_id;
    const policyText = validPolicies[0].content;

    // Get Policy Details
    const { data: policy } = await supabase
        .from('policies')
        .select('*')
        .eq('id', targetPolicyId)
        .single();

    console.log(`   ✅ Target Policy ID: ${targetPolicyId}`);
    console.log(`   📄 Title: ${policy?.title}`);
    console.log(`   🔗 URL: ${policy?.source_url}`);
    console.log(`   📝 Rules Content: ${policyText?.length} chars`);

    // Override MOCK_REQUEST CPT to match this policy (just for display)
    // We'll proceed with the existing Clinical Note, assuming it "might" match standard ultrasound language
    // or we can let the AI fail the match, which is also a valid test result.

    console.log(`   ✅ Retrieved ${policyText.length} chars of policy text.`);

    // 4. Verification (The "Brain")
    console.log("\n3️⃣  Verifying with AI...");

    const { generateText } = await import('../src/lib/aiClient');

    const systemPrompt = `
    You are a Medical Director for an Insurance Company.
    Your job is to review a Pre-Authorization Request against the provided Policy Document.
    
    If the Clinical Note meets the Policy Criteria -> APPROVE.
    If it does not -> DENY.
    If information is missing -> MISSING_INFO.
    
    Cite the specific text from the Policy that supports your decision.
    `;

    const userPrompt = `
    [POLICY DOCUMENT HTML]
    ${policyText.substring(0, 20000)} ... (truncated for token limits if needed)
    
    [CLINICAL NOTE]
    ${MOCK_REQUEST.clinical_note}
    
    [TASK]
    Determine medical necessity. Return JSON.
    `;

    try {
        const response = await generateText({
            systemPrompt,
            userPrompt,
            jsonMode: true,
            temperature: 0
        });

        console.log("\n🤖 AI Verdict:");
        console.log(response);

    } catch (e: any) {
        console.error("❌ AI Error:", e.message);
    }
}

runVerification();
