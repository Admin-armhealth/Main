
// Standalone Verification Script
// Usage: npx ts-node scripts/verify_logic_standalone.ts
require('dotenv').config({ path: '.env.local' });

import { generateText } from '../src/lib/aiClient';
import { getPreAuthPrompt, getCritiquePrompt } from '../src/lib/prompts';

async function runTest() {
    console.log('🧪 Starting Standalone Logic Verification...');
    console.log(`   AI Provider: ${process.env.AI_PROVIDER}`);

    // TEST 1: APPROVAL ENGINE (Weak Note)
    console.log('\n----------------------------------------');
    console.log('🔬 TEST 1: Approval Engine (Weak Data)');

    // 1. Generate Fake Draft (Simulating Phase 1)
    const weakContext = {
        clinicType: 'Orthopedics',
        extractedText: "Patient knee hurts. Swollen.",
        cptCodes: ['73721'],
        icdCodes: ['M25.561'],
        payer: 'Aetna'
    };

    // We can skip generating the draft and just test the Critique Prompt with a dummy draft
    const dummyDraft = `
    Dear Aetna,
    Please approve MRI for patient with knee pain.
    Thank you.
    `;

    const { systemPrompt: cSys, userPrompt: cUser } = getCritiquePrompt({
        originalRequestParameters: weakContext,
        generatedDraft: dummyDraft,
        policyContext: "OFFICIAL GUIDELINES: Must have 6 weeks of PT and X-Ray."
    });

    try {
        const critiqueRaw = await generateText({
            systemPrompt: cSys,
            userPrompt: cUser,
            temperature: 0.1,
            jsonMode: true // Important for new prompt
        });

        console.log('   🤖 AI Response:', critiqueRaw);
        const critique = JSON.parse(critiqueRaw);

        if (critique.approval_likelihood < 60) {
            console.log('   ✅ PASS: Appropriately Low Score:', critique.approval_likelihood);
        } else {
            console.log('   ❌ FAIL: Score too high:', critique.approval_likelihood);
        }

        if (critique.checklist && critique.checklist.length > 0) {
            console.log('   ✅ PASS: Checklist generated:', critique.checklist.length, 'items');
        } else {
            console.log('   ❌ FAIL: No checklist returned.');
        }

    } catch (e) {
        console.error('   ❌ FAIL: Critique Error', e);
    }

    // TEST 2: PAYER PERSONA PROMPT GENERATION
    console.log('\n----------------------------------------');
    console.log('🔬 TEST 2: Payer Persona Prompt Injection');

    const { systemPrompt: aetnaSys } = getPreAuthPrompt({
        extractedText: "Test",
        payer: 'Aetna',
        templates: { tone: 'standard' }
    });

    if (aetnaSys.includes('AETNA STYLE GUIDE') && aetnaSys.includes('Conservative Management Timeline')) {
        console.log('   ✅ PASS: Aetna instructions injected into System Prompt.');
    } else {
        console.log('   ❌ FAIL: Aetna instructions missing.');
    }

    const { systemPrompt: cignaSys } = getPreAuthPrompt({
        extractedText: "Test",
        payer: 'Cigna',
        templates: { tone: 'standard' }
    });

    if (cignaSys.includes('CIGNA STYLE GUIDE') && cignaSys.includes('Objective Diagnostic Findings')) {
        console.log('   ✅ PASS: Cigna instructions injected into System Prompt.');
    } else {
        console.log('   ❌ FAIL: Cigna instructions missing.');
    }

}

runTest();
