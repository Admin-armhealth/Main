
// import fetch from 'node-fetch'; // Standard for scripts, or use global fetch if Node 18+

const BASE_URL = 'http://localhost:3001';

interface EvaluatedResult {
    scenario: string;
    type: 'Pre-Auth' | 'Appeal';
    success: boolean;
    durationMs: number;
    outputLength: number;
    contentPreview: string;
}

const scenarios = [
    {
        name: "Orthopedic - ACL Reconstruction",
        type: "Pre-Auth",
        endpoint: "/api/preauth",
        payload: {
            clinicType: "Orthopedic Surgery",
            specialty: "Orthopedics",
            extractedText: "Patient is a 25M with ACL tear confirmed on MRI. Failed 6 weeks of PT. Instability persists.",
            cptCodes: ["29888"],
            icdCodes: ["S83.512A"],
            payer: "Blue Cross"
        }
    },
    {
        name: "Cardiac - Nuclear Stress Test",
        type: "Pre-Auth",
        endpoint: "/api/preauth",
        payload: {
            clinicType: "Cardiology",
            specialty: "Cardiology",
            extractedText: "60F with new onset exertional chest pain. History of hypertension. resting EKG normal.",
            cptCodes: ["78452"],
            icdCodes: ["R07.9"],
            payer: "Medicare"
        }
    },
    {
        name: "Appeal - Medical Necessity Denial (MRI)",
        type: "Appeal",
        endpoint: "/api/appeal",
        payload: {
            denialReason: "Not Medically Necessary - Conservative therapy not documented",
            extractedText: "Patient has 3 months of back pain. PT records attached showing 12 sessions attended. NSAIDs ineffective.",
            cptCodes: ["72148"],
            icdCodes: ["M54.5"]
        }
    },
    {
        name: "Appeal - Prior Auth Missing",
        type: "Appeal",
        endpoint: "/api/appeal",
        payload: {
            denialReason: "No Prior Authorization on File",
            extractedText: "Emergency appendectomy performed on 12/10. Patient admitted through ER.",
            cptCodes: ["44950"],
            icdCodes: ["K35.80"]
        }
    }
];

async function runEvaluation() {
    console.log(`Starting Evaluation against ${BASE_URL}...\n`);
    const results: EvaluatedResult[] = [];

    for (const test of scenarios) {
        console.log(`Testing: ${test.name}...`);
        const start = Date.now();
        try {
            const res = await fetch(`${BASE_URL}${test.endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(test.payload)
            });

            const duration = Date.now() - start;
            if (!res.ok) {
                console.error(`  FAILED: ${res.status} ${res.statusText}`);
                results.push({
                    scenario: test.name,
                    type: test.type as 'Pre-Auth' | 'Appeal',
                    success: false,
                    durationMs: duration,
                    outputLength: 0,
                    contentPreview: `Error: ${res.statusText}`
                });
                continue;
            }

            const data = await res.json();
            const content = data.result || '';

            results.push({
                scenario: test.name,
                type: test.type as 'Pre-Auth' | 'Appeal',
                success: true,
                durationMs: duration,
                outputLength: content.length,
                contentPreview: content.substring(0, 100).replace(/\n/g, ' ') + '...'
            });
            console.log(`  Success (${duration}ms)`);

        } catch (error) {
            console.error(`  ERROR: ${(error as Error).message}`);
            results.push({
                scenario: test.name,
                type: test.type as 'Pre-Auth' | 'Appeal',
                success: false,
                durationMs: Date.now() - start,
                outputLength: 0,
                contentPreview: `Exception: ${(error as Error).message}`
            });
        }
    }

    // Generate Report
    console.log('\n\n# Evaluation Report\n');
    console.table(results.map(r => ({
        Scenario: r.scenario,
        Type: r.type,
        Status: r.success ? 'PASS' : 'FAIL',
        'Time(ms)': r.durationMs,
        'Length': r.outputLength
    })));
}

runEvaluation();
