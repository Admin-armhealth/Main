
import { redactPHI } from '../src/lib/privacy';
import { getPreAuthPrompt, getAppealPrompt } from '../src/lib/prompts';

async function verifyPrivacy() {
    console.log('🔒 Starting Privacy & Redaction Verification...\n');

    let passed = 0;
    let failed = 0;

    function assert(label: string, condition: boolean) {
        if (condition) {
            console.log(`   ✅ PASS: ${label}`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: ${label}`);
            failed++;
        }
    }

    // 1. Test Redaction Utility
    console.log('1. Testing Redaction Utility (src/lib/privacy.ts)');
    const textWithPHI = "Patient John Doe (DOB: 01/01/1980) has ID 123456789.";
    // IMPORTANT: Provide the known name, as the application would
    const redacted = redactPHI(textWithPHI, "John Doe");

    assert('Name Redacted', !redacted.includes('John Doe'));
    assert('DOB Redacted', !redacted.includes('01/01/1980'));
    assert('ID Redacted', !redacted.includes('123456789'));
    assert('Placeholder Inserted', redacted.includes('[PATIENT_NAME]'));
    console.log('   Original:', textWithPHI);
    console.log('   Redacted:', redacted);
    console.log('');

    // 2. Test Pre-Auth Prompt Safety
    console.log('2. Testing Pre-Auth Prompt Safety (src/lib/prompts.ts)');
    const mockPreAuth = {
        extractedText: "Patient Alice Smith needs MRI.",
        cptCodes: ["72148"],
        icdCodes: ["M54.5"],
        payer: "Aetna",
        patientRaw: { name: "Alice Smith", id: "987", dob: "02/02/1990" },
        providerRaw: { name: "Dr. Bob", npi: "1112223333", clinicName: "PrivClinic" }
    };

    const preAuthPrompts = getPreAuthPrompt({
        ...mockPreAuth,
        denialReason: "N/A"
    } as any);

    // Check System Prompt
    assert('System Prompt contains NO Patient Name', !preAuthPrompts.systemPrompt.includes('Alice Smith'));
    assert('System Prompt contains NO DOB', !preAuthPrompts.systemPrompt.includes('02/02/1990'));

    // Check User Prompt
    assert('User Prompt contains NO Patient Name', !preAuthPrompts.userPrompt.includes('Alice Smith'));
    assert('User Prompt contains NO ID', !preAuthPrompts.userPrompt.includes('987'));
    console.log('');

    // 3. Test Appeal Prompt Safety
    console.log('3. Testing Appeal Prompt Safety');
    const mockAppeal = {
        extractedText: "Patient Charlie Brown denied.",
        denialReason: "Not medical necessity.",
        cptCodes: ["99213"],
        icdCodes: ["R10.9"],
        patientRaw: { name: "Charlie Brown", id: "555", dob: "03/03/2000" },
        providerRaw: { name: "Dr. Snoopy", npi: "4445556666", clinicName: "DogHouse" }
    };

    const appealPrompts = getAppealPrompt(mockAppeal as any);

    assert('Appeal System Prompt contains NO Patient Name', !appealPrompts.systemPrompt.includes('Charlie Brown'));
    assert('Appeal User Prompt contains NO Patient Name', !appealPrompts.userPrompt.includes('Charlie Brown'));
    console.log('');

    // Final Report
    console.log('---------------------------------------------------');
    console.log(`Privacy Audit Complete: ${passed} Passed, ${failed} Failed`);

    if (failed > 0) process.exit(1);
}

verifyPrivacy();
