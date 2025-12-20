
// Plain JS version to avoid TS/Module issues
const BASE_URL = 'http://localhost:3000';

async function testApprovalEngine() {
    console.log('🚀 Starting Intelligent Features E2E Test (JS Mode)...\n');

    // TEST 1: WEAK NOTE
    console.log('🧪 TEST 1: Testing "Weak" Clinical Note (Expect Low Score)...');
    const weakNote = `
        Patient has knee pain. 
        Pain started a while ago. 
        Wants MRI. 
        Exam: looks swollen.
    `;

    try {
        const res1 = await fetch(`${BASE_URL}/api/preauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clinicType: 'Orthopedics',
                specialty: 'Orthopedics',
                extractedText: weakNote,
                cptCodes: ['73721'],
                icdCodes: ['M25.561'],
                payer: 'Aetna',
                templates: { tone: 'standard' }
            })
        });

        const text1 = await res1.text();
        try {
            const data1 = JSON.parse(text1);
            if (data1.error) throw new Error(data1.error);

            console.log(`   👉 Score: ${data1.approval_likelihood}%`);
            console.log(`   👉 Confidence: ${data1.confidence_level}`);

            if (data1.approval_likelihood < 60) {
                console.log('   ✅ PASS: Low score correctly identified.');
            } else {
                console.log('   ❌ FAIL: Score too high for weak note:', data1.approval_likelihood);
            }
        } catch (jsonErr) {
            console.error('   ❌ FAIL: Invalid JSON Response:', text1.substring(0, 500));
            throw new Error('API returned non-JSON');
        }

    } catch (e) {
        console.error('   ❌ FAIL: Execution Error', e.message);
    }

    console.log('\n--------------------------------------------------\n');

    // TEST 2: STRONG NOTE + AETNA PERSONA
    console.log('🧪 TEST 2: Testing "Strong" Note + Aetna (Expect High Score + Date Focus)...');
    const strongNote = `
        Patient with 6 weeks of right knee pain.
        Started PT on Jan 1, 2024, ended Feb 15, 2024. No relief.
        NSAIDs (Ibuprofen 600mg) for 2 months failed.
        Physical Exam: Positive McMurray test right knee.
        Suspect Meniscus Tear.
        Requesting MRI.
    `;

    try {
        const res2 = await fetch(`${BASE_URL}/api/preauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clinicType: 'Orthopedics',
                specialty: 'Orthopedics',
                extractedText: strongNote,
                cptCodes: ['73721'],
                icdCodes: ['M23.221'],
                payer: 'Aetna',
                templates: { tone: 'standard' }
            })
        });

        const data2 = await res2.json();
        console.log(`   👉 Score: ${data2.approval_likelihood}%`);
        console.log(`   👉 Result Preview: ${data2.result.substring(0, 100)}...`);

        // CHECK SCORE
        if (data2.approval_likelihood > 75) {
            console.log('   ✅ PASS: High score correctly identified.');
        } else {
            console.log('   ❌ FAIL: Score too low for strong note:', data2.approval_likelihood);
        }

        // CHECK STYLE
        const text = data2.result.toLowerCase();
        if (text.includes('jan 1') || text.includes('feb 15')) {
            console.log('   ✅ PASS: Aetna Persona detected (Dates included).');
        } else {
            console.log('   ⚠️ WARN: Specific dates might be missing in generated text.');
        }

    } catch (e) {
        console.error('   ❌ FAIL: Request Error', e.message);
    }

    console.log('\n--------------------------------------------------\n');

    // TEST 3: CIGNA PERSONA
    console.log('🧪 TEST 3: Testing Cigna Persona (Expect Imaging/Objective Focus)...');
    try {
        const res3 = await fetch(`${BASE_URL}/api/preauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clinicType: 'Orthopedics',
                specialty: 'Orthopedics',
                extractedText: strongNote,
                cptCodes: ['73721'],
                icdCodes: ['M23.221'],
                payer: 'Cigna',
                templates: { tone: 'standard' }
            })
        });

        const data3 = await res3.json();

        if (data3.result.toLowerCase().includes('cigna')) {
            console.log('   ✅ PASS: Cigna Header/Template used.');
        } else {
            console.log('   ⚠️ WARN: Cigna specific header not found.');
        }

    } catch (e) {
        console.error('   ❌ FAIL: Request Error', e.message);
    }
}

testApprovalEngine();
