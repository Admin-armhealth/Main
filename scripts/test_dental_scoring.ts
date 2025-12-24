
import { applyScoringGuardrails } from '../src/lib/scoring_guardrails';

// Mocks
const MOCK_CRITIQUE_BASE = {
    clinical_score: 90,
    overall_status: 'ready',
    score_band: 'strong_case',
    primary_risk_factor: { type: 'clinical' },
    clinical_evidence_assessment: {
        conservative_therapy: { present: false, duration_weeks: 0, strength: 'missing' }
    },
    denial_risk_factors: [],
    checklist: [],
    missing_info: []
};

// Test Runners
function runTest(name: string, specialty: string, critiqueOverrides: any, expectedScore: number) {
    console.log(`TEST: ${name}`);

    const critique = {
        ...MOCK_CRITIQUE_BASE,
        ...critiqueOverrides,
        missing_info: [...MOCK_CRITIQUE_BASE.missing_info] // Deep copy
    };

    const { auditData, logs } = applyScoringGuardrails(critique, specialty);

    const passed = auditData.clinical_score === expectedScore;
    if (passed) {
        console.log(`   ✅ PASS: Score ${auditData.clinical_score} (Expected ${expectedScore})`);
    } else {
        console.error(`   ❌ FAIL: Score ${auditData.clinical_score} (Expected ${expectedScore})`);
        console.log('   Logs:', logs);
    }
    return passed;
}

// Scenarios
console.log('Starting Dental Scoring Verification...');

// 1. Ortho Edge Case: Missing PT -> Should be Capped at 35
runTest(
    'Orthopedics: Missing PT (Standard Rule)',
    'Orthopedics',
    {
        clinical_evidence_assessment: { conservative_therapy: { present: true, duration_weeks: 2, strength: 'weak' } }
    },
    35
);

// 2. Dental Edge Case: Missing PT -> Should NOT be Capped (Score 90)
runTest(
    'Dentistry: No PT Required (Ignore Ortho Rule)',
    'Dentistry',
    {
        clinical_evidence_assessment: { conservative_therapy: { present: true, duration_weeks: 2, strength: 'weak' } },
        checklist: [{ label: 'Tooth Number 19', status: 'PASS' }, { label: 'X-Ray Attached', status: 'PASS' }]
    },
    90
);

// 3. Dental Edge Case: Missing Tooth Number -> Should be Capped at 50
runTest(
    'Dentistry: Missing Tooth Number (Dental Rule)',
    'Dentistry',
    {
        clinical_score: 90,
        checklist: [{ label: 'X-Ray Attached', status: 'PASS' }] // No Tooth Number
    },
    50
);

// 4. Mismatch Kill Switch (Global) -> Should be 0
runTest(
    'Global: Clinical Mismatch',
    'Dentistry',
    {
        primary_risk_factor: { type: 'clinical_mismatch' }
    },
    0
);
