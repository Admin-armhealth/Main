
import { getPreAuthPrompt } from '../src/lib/prompts';

function runTest(name: string, assertion: boolean) {
    if (assertion) {
        console.log(`✅ PASS: ${name}`);
    } else {
        console.error(`❌ FAIL: ${name}`);
    }
}

console.log('🧪 Verifying Prompt Generation...');

// Test 1: Tone - Urgent
const urgent = getPreAuthPrompt({
    extractedText: 'Patient in severe pain.',
    templates: { tone: 'urgent' }
});
runTest('Tone: Urgent contains "DIRECT"', urgent.systemPrompt.includes('DIRECT'));
runTest('Tone: Urgent contains "ASSERTIVE"', urgent.systemPrompt.includes('ASSERTIVE'));

// Test 2: Tone - Friendly
const friendly = getPreAuthPrompt({
    extractedText: 'Patient needs help.',
    templates: { tone: 'friendly' }
});
runTest('Tone: Friendly contains "PATIENT-ADVOCACY"', friendly.systemPrompt.includes('PATIENT-ADVOCACY'));

// Test 3: Specialty - Cardiology
const cardio = getPreAuthPrompt({
    extractedText: 'Heart issue.',
    specialty: 'Cardiology'
});
runTest('Specialty: Cardiology contains "LVEF%"', cardio.systemPrompt.includes('LVEF%'));

// Test 4: Specialty - Dentistry
const dental = getPreAuthPrompt({
    extractedText: 'Toothache.',
    specialty: 'Dentistry'
});
runTest('Specialty: Dentistry contains "TOOTH NUMBERS"', dental.systemPrompt.includes('TOOTH NUMBERS'));
runTest('Specialty: Dentistry contains "PERIODONTAL STATUS"', dental.systemPrompt.includes('PERIODONTAL STATUS'));

// Test 5: Default Fallback
const standard = getPreAuthPrompt({
    extractedText: 'Standard checkup.',
    templates: { tone: 'unknown_tone' } // Should fall back to standard
});
runTest('Tone: Fallback defaults to "PROFESSIONAL and OBJECTIVE"', standard.systemPrompt.includes('PROFESSIONAL and OBJECTIVE'));

console.log('✅ Verification Complete.');
