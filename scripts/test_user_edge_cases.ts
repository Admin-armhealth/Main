
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function runEdgeCaseTest() {
    console.log('🧪 Starting User Behavior Edge Case Tests...\n');

    // 1. The "Lazy" Application (Missing Info)
    console.log('🔴 TEST CASE 1: The "Lazy" Application (Missing Info)');
    const lazyPayload = {
        clinicType: 'General Practice',
        specialty: 'Orthopedics',
        extractedText: "Patient needs MRI of lumbar spine. Back pain for 3 months.",
        cptCodes: ["72148"], // MRI Lumbar
        icdCodes: ["M54.5"],
        payer: "Aetna",
        patientRaw: { name: "Lazy User", id: "123", dob: "01/01/1980" },
        providerRaw: { name: "Dr. Tired", npi: "1000000000", clinicName: "QuickClinic" }
    };

    try {
        const res1 = await fetch(`${BASE_URL}/api/preauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-test-bypass': 'true' },
            body: JSON.stringify(lazyPayload)
        });
        const data1: any = await res1.json();

        console.log(`   Status: ${res1.status}`);
        console.log(`   Score: ${data1.approval_likelihood}/100`);
        console.log(`   Missing Info:`, data1.missing_info);

        if (data1.approval_likelihood < 50 && data1.missing_info?.length > 0) {
            console.log('   ✅ PASS: System punished laziness and requested specific info.');
        } else {
            console.error('   ❌ FAIL: System was too lenient.');
        }

    } catch (e: any) { console.error('   ❌ ERROR:', e.message); }
    console.log('---------------------------------------------------\n');

    // 2. The "Mismatch" Error (Knee CPT vs Shoulder Text)
    console.log('🟠 TEST CASE 2: The "Mismatch" (Shoulder Text vs Knee CPT)');
    const mismatchPayload = {
        clinicType: 'Orthopedics',
        specialty: 'Orthopedics',
        extractedText: "Patient complains of Left Shoulder pain. Rotator cuff weakness. Positive Hawkins test. Requesting MRI Shoulder.",
        cptCodes: ["29881"], // Knee Arthroscopy (WRONG CODE)
        icdCodes: ["M75.1"], // Rotator Cuff
        payer: "Cigna",
        patientRaw: { name: "Confused User", id: "456", dob: "01/01/1980" },
        providerRaw: { name: "Dr. Haste", npi: "1000000000", clinicName: "OrthoCare" }
    };

    try {
        const res2 = await fetch(`${BASE_URL}/api/preauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-test-bypass': 'true' },
            body: JSON.stringify(mismatchPayload)
        });
        const data2: any = await res2.json();

        console.log(`   Status: ${res2.status}`);
        // Check risks for mismatch
        const mismatchRisk = data2.denial_risk_factors?.find((r: any) => r.risk.toLowerCase().includes('mismatch') || r.rationale.toLowerCase().includes('knee'));

        if (mismatchRisk) {
            console.log(`   ✅ PASS: Detected Mismatch: "${mismatchRisk.rationale}"`);
        } else {
            console.log('   ⚠️ WARNING: AI did not explicitly tag "Mismatch" in risk factors. Checking text...');
            // Fallback check on text content might be needed if AI puts it in "missing_info"
            console.log('   Checklist:', JSON.stringify(data2.checklist, null, 2));
        }

    } catch (e: any) { console.error('   ❌ ERROR:', e.message); }
    console.log('---------------------------------------------------\n');

    // 3. The "Vague" Appeal (Bad Evidence)
    console.log('🟡 TEST CASE 3: The "Vague" Appeal');
    const vagueAppealPayload = {
        clinicType: 'Orthopedics',
        specialty: 'Orthopedics',
        extractedText: "Patient tried PT for a while. NSAIDs didn't help. Please approve.",
        denialReason: "Conservative therapy duration not specified.",
        originalRequestParameters: {
            cptCodes: ["29881"]
        },
        payer: "UHC",
        patientRaw: { name: "Vague User", id: "789", dob: "01/01/1980" },
        providerRaw: { name: "Dr. Vague", npi: "1000000000", clinicName: "VagueClinic" }
    };

    try {
        const res3 = await fetch(`${BASE_URL}/api/appeal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-test-bypass': 'true' },
            body: JSON.stringify(vagueAppealPayload)
        });
        const data3: any = await res3.json();

        console.log(`   Status: ${res3.status}`);
        console.log(`   Score: ${data3.approval_likelihood}/100`);

        if (data3.approval_likelihood < 40) {
            console.log('   ✅ PASS: Low score for vague evidence.');
        } else {
            console.error('   ❌ FAIL: Score too high for vague input.');
        }

    } catch (e: any) { console.error('   ❌ ERROR:', e.message); }

}

runEdgeCaseTest();
