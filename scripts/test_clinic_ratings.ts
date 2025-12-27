import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// FORCE OpenAI
process.env.AI_PROVIDER = 'openai';

console.log("Environment Status:");
console.log("AI_PROVIDER:", process.env.AI_PROVIDER);
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Set (starts with " + process.env.OPENAI_API_KEY.substring(0, 3) + ")" : "MISSING");

// Mock context for redactPHI if needed, or it works as is
// redactPHI imports from 'privacy', hopefully no heavy dependencies there.

const CLINICS = {
    'Orthopedics': {
        cpt: ['29881'],
        icd: ['M23.2'],
        insurers: ['Aetna', 'Cigna'],
        scenarios: {
            'BAD (Vague PT)': `Patient with knee pain for 3 months. Tried ibuprofen. Wants surgery.`,
            'GOOD (Perfect)': `Patient: John Doe (DOB: 01/01/1980)
                               Provider NPI: 1234567890 | TIN: 99-9999999
                               History: Patient with right knee meniscal tear (confirmed on MRI 1/15/24). 
                               Failed conservative therapy for 8 weeks:
                               - PT from 2/1/24 to 4/1/24 (3x weekly).
                               - NSAIDs daily for 3 months.
                               Mechanical symptoms: Catching and locking reported during exam. 
                               Functional limit: Unable to climb stairs or squat.
                               Plan: Requesting Arthroscopic Meniscectomy (CPT 29881).`
        }
    },
    'Cardiology': {
        cpt: ['93458'],
        icd: ['I20.0'],
        insurers: ['UnitedHealthcare', 'BCBS'],
        scenarios: {
            'BAD (No LVEF)': `Chest pain at rest. EKG abnormal. Needs Cath.`,
            'GOOD (Perfect)': `Patient: John Doe (DOB: 01/01/1980)
                               Provider NPI: 1234567890 | TIN: 99-9999999
                               Diagnosis: Unstable Angina. 
                               EKG (1/10/24): ST depression V1-V3. 
                               Stress Test (1/10/24): High risk, achieved only 4 METs due to chest pain. 
                               LVEF: 45% on Echo (1/05/24). 
                               Angio Indication: 80% Proximal LAD stenosis suspected.
                               Plan: Urgent Cardiac Cath (CPT 93458).`
        }
    },
    'Gastroenterology': {
        cpt: ['45378'],
        icd: ['K50.9'],
        insurers: ['Aetna', 'UnitedHealthcare'],
        scenarios: {
            'BAD (Vague)': `Stomach hurts. Diarrhea sometimes. Family history of cancer.`,
            'GOOD (Perfect)': `Patient: John Doe
                               Provider NPI: 1234567890 | TIN: 99-9999999
                               History: Chronic Diarrhea x 6 months (onset Aug 2023). 
                               Weight loss: 15lbs in 2 months (documented). 
                               Alarm Symptom: Occult blood positive on 2/1/24. 
                               Family History: Father diagnosed with Colon CA at age 45.
                               Plan: Diagnostic Colonoscopy (CPT 45378).`
        }
    },
    'Dentistry': {
        cpt: ['D3330'],
        icd: ['K04.0'],
        insurers: ['Cigna', 'BCBS'],
        scenarios: {
            'BAD (No Tooth #)': `Tooth hurts when drinking cold water. Deep decay visible.`,
            'GOOD (Perfect)': `Patient: John Doe
                               Provider NPI: 1234567890 | TIN: 99-9999999
                               Tooth #3 (Maxillary First Molar). 
                               Symptoms: Spontaneous, lingering thermal sensitivity > 10s. 
                               Exam: Percussion positive. 
                               X-Ray (2/20/24): Periapical radiolucency attached. 
                               Dx: Irreversible Pulpitis.
                               Plan: Root Canal Therapy (D3330).`
        }
    }
};

const TONES = ['urgent', 'standard'];

async function runTest() {
    // Dynamic imports to ensure Env is set
    const { getPreAuthPrompt, getCritiquePrompt } = await import('../src/lib/prompts');
    const { generateText } = await import('../src/lib/aiClient');
    const { applyScoringGuardrails } = await import('../src/lib/scoring_guardrails');
    const { extractJSON } = await import('../src/lib/jsonUtils');

    console.log("Starting Comprehensive Clinic Rating Test (Real AI)...\n");
    console.log("| Clinic | Insurer | Scenario | Tone | Score | Verdict | Risk Factors |");
    console.log("|---|---|---|---|---|---|---|");

    for (const [specialty, data] of Object.entries(CLINICS)) {
        for (const insurer of data.insurers) {
            for (const [scenarioName, text] of Object.entries(data.scenarios)) {
                for (const tone of TONES) {
                    try {
                        // 1. Generate Draft
                        const { systemPrompt, userPrompt } = getPreAuthPrompt({
                            specialty,
                            clinicType: 'Specialist Clinic',
                            extractedText: text,
                            cptCodes: data.cpt,
                            icdCodes: data.icd,
                            payer: insurer,
                            templates: { tone },
                            providerRaw: { name: 'Dr. Test', npi: '1234567890', tin: '999', clinicName: 'Test Clinic' },
                            patientRaw: { name: 'John Doe', id: '123', dob: '01/01/1980' }
                        });

                        const draft = await generateText({
                            systemPrompt,
                            userPrompt,
                            temperature: 0.3
                        });

                        // 2. Critique Draft
                        const { systemPrompt: critiqueSystem, userPrompt: critiqueUser } = getCritiquePrompt({
                            originalRequestParameters: {
                                specialty,
                                cptCodes: data.cpt,
                                extractedText: text,
                                payer: insurer
                            },
                            generatedDraft: draft,
                            policyContext: `${insurer} Policy Guidelines: Strict adherence to clinical evidence required.`
                        });

                        const critiqueResponse = await generateText({
                            systemPrompt: critiqueSystem,
                            userPrompt: critiqueUser,
                            temperature: 0.1
                        });

                        const critique = extractJSON(critiqueResponse);
                        const { auditData } = applyScoringGuardrails(critique, specialty);

                        const risks = auditData.denial_risk_factors?.map((r: any) => typeof r === 'string' ? r : r.risk).join(', ') || '';

                        console.log(`| ${specialty} | ${insurer} | ${scenarioName.split(' ')[0]} | ${tone} | ${auditData.clinical_score} | ${auditData.simulated_verdict} | ${risks} |`);

                    } catch (err) {
                        console.error(`Error processing ${specialty} - ${insurer} - ${scenarioName} - ${tone}:`, err);
                    }
                }
            }
        }
    }
}

runTest();
