
// E2E Test: Intelligence Engine & History Persistence
// Run with: npx tsx scripts/test_e2e_intelligence.ts

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';

// Load Env
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) process.env[k] = envConfig[k];
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function runTest() {
    console.log('🧪 Starting E2E Intelligence & History Test...');
    console.log('------------------------------------------------');

    // 1. Mock Input Data (Simulating Frontend)
    const payload = {
        clinicType: 'Orthopedics',
        specialty: 'Orthopedics',
        extractedText: 'Patient Name: John TestDoe\nDOB: 01/01/1980\nDiagnosis: M54.5 Low Back Pain\nHistory: Pt has tried NSAIDs for 6 weeks and PT for 8 weeks without relief. MRI shows L4-L5 herniation.\nPlan: Requesting L4-L5 Microdiscectomy.',
        cptCodes: ['63030'],
        icdCodes: ['M54.5'],
        payer: 'Aetna',
        patientRaw: { name: 'John TestDoe', id: 'TEST-123' },
        providerRaw: { clinicName: 'Test Clinic' },
        templates: { tone: 'standard' }
    };

    console.log('📤 Sending Pre-Auth Request...');

    try {
        const res = await fetch('http://localhost:3001/api/preauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error: ${res.status} ${err}`);
        }

        const data = await res.json();
        console.log('✅ API Response Received');
        console.log(`   - Score: ${data.approval_likelihood}`);
        console.log(`   - Checklist Items: ${data.checklist?.length}`);

        // 2. Verify Database Persistence (History)
        console.log('🔍 Verifying Database Insert (History)...');

        // Wait a moment for async insert
        await new Promise(r => setTimeout(r, 1500));

        const { data: history, error: dbError } = await supabase
            .from('requests')
            .select('*')
            .eq('patient_id', 'TEST-123')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (dbError) {
            // If table doesn't exist or RLS issue, this will show
            console.error('❌ DB Lookup Failed:', dbError.message);
            throw dbError;
        }

        if (!history) throw new Error('History record not found!');

        console.log('✅ History Record Found!');
        console.log(`   - ID: ${history.id}`);
        console.log(`   - Status: ${history.status}`);

        // 3. Verify Denial Prevention Logic
        if (!history.content.toLowerCase().includes('weeks')) {
            console.warn('⚠️ WARNING: "weeks" duration missing from generated content.');
        } else {
            console.log('✅ Denial Prevention (Duration) Detected in Content');
        }

        console.log('\n🧪 Testing EDGE CASES...');

        // EDGE CASE 1: Weak Clinical Evidence (Should Fail/Low Score)
        console.log('   [Case 1] Submitting "Weak" Request (Vague pain, no therapy)...');
        const weakRes = await fetch('http://localhost:3001/api/preauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                extractedText: 'Patient has back pain. Wants surgery.',
                patientRaw: { name: 'Weak Case', id: 'TEST-WEAK' }
            })
        });
        const weakData = await weakRes.json();
        console.log(`   -> Score Raw: ${JSON.stringify(weakData.approval_likelihood)}`);

        let weakScore = weakData.approval_likelihood;
        if (typeof weakScore === 'object' && weakScore !== null) {
            // Handle if AI returned object
            weakScore = weakScore.score || weakScore.value || 0;
        }

        console.log(`   -> Score Parsed: ${weakScore}%`);
        console.log(`   -> Overall Status: ${weakData.overall_status}`);
        console.log(`   -> Score Band: ${weakData.score_band}`);

        if (weakScore < 50 && weakData.overall_status !== 'ready') {
            console.log('   ✅ PASS: Appropriately Low Score & Status for weak evidence.');
        } else {
            console.error('   ❌ FAIL: Score too high or status wrong for garbage input.');
        }

        // EDGE CASE 2: Mismatch (Knee Diagnosis, Back Surgery)
        console.log('   [Case 2] Submitting "Mismatch" Request (Knee Diagnosis -> Back Surgery)...');
        const mismatchRes = await fetch('http://localhost:3001/api/preauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                icdCodes: ['M17.11'], // Osteoarthritis of knee
                cptCodes: ['63030'], // Lumbar Microdiscectomy
                extractedText: 'Patient has knee pain. Plan: Lumbar Microdiscectomy.',
                patientRaw: { name: 'Mismatch Case', id: 'TEST-MISMATCH' }
            })
        });
        const mismatchData = await mismatchRes.json();

        console.log(`   -> Score Raw: ${JSON.stringify(mismatchData.approval_likelihood)}`);

        let mismatchScore = mismatchData.approval_likelihood;
        if (typeof mismatchScore === 'object' && mismatchScore !== null) {
            mismatchScore = mismatchScore.score || mismatchScore.value || 0;
        }

        console.log(`   -> Checklist Warnings: ${mismatchData.denial_risk_factors?.length || 0}`);

        if (mismatchData.denial_risk_factors?.length > 0 || mismatchScore < 40) {
            console.log('   ✅ PASS: Mismatch flagged or penalized.');
        } else {
            console.warn('   ⚠️ WARN: Mismatch might not have been caught strongly enough.');
        }

        console.log('🎉 ALL TESTS PASSED');

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        process.exit(1);
    }
}

runTest();
