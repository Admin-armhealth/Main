import { test, expect, Request } from '@playwright/test';
import { POST as preAuthHandler } from '@/app/api/preauth/route';
import { POST as appealHandler } from '@/app/api/appeal/route';
import { NextRequest } from 'next/server';

/**
 * PHI LEAK GUARD - AUTOMATED COMPLIANCE TEST
 * ==========================================
 * 
 * Goal: Ensure NO PHI is ever logged, stored in DB, or sent to external 3rd parties.
 * 
 * How it works:
 * 1. Defines a FAKE_PHI_FIXTURE with realistic sensitive data.
 * 2. Mocks "Sinks" where data could leak:
 *    - Console (log, error, warn, info)
 *    - Supabase (DB persistence)
 *    - Global Fetch (External APIs)
 * 3. Runs the actual API handlers with the fake PHI data.
 * 4. Asserts that the Sinks never received the PHI values.
 * 
 * Run with:
 * (Windows PowerShell)
 * $env:NEXT_PUBLIC_SUPABASE_URL="https://example.com"; $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="dummy"; $env:OPENAI_API_KEY="dummy"; npx playwright test e2e/phi_leak_guard.spec.ts
 *
 * (Mac/Linux)
 * NEXT_PUBLIC_SUPABASE_URL="https://example.com" NEXT_PUBLIC_SUPABASE_ANON_KEY="dummy" OPENAI_API_KEY="dummy" npx playwright test e2e/phi_leak_guard.spec.ts
 */

// -----------------------------------------------------------------------------
// 1. DEFINITIONS & FIXTURES
// -----------------------------------------------------------------------------

const FAKE_PHI_FIXTURE = {
    name: "Jonathan Q. Patient-Doe",
    dob: "1985-11-24", // YYYY-MM-DD
    dob_alt: "11/24/1985",
    phone: "555-019-2834",
    email: "jonathan.doe.patient@example-medical-provider.com",
    policy_id: "POL-9988776655",
    group_id: "GRP-12345",
    mrn: "MRN-11223344",
    address: "123 Recovery Lane, Healing City, CA 90210",
    diagnosis_code: "M54.5", // Low back pain (common but technically PHI if linked)
    clinical_note_snippet: "Patient reports severe pain in lower back radiating to left leg since 1985-11-24.",
};

const SAFE_TOKENS = [
    "M54.5", // Diagnosis codes alone are usually OK, but we'll flag if they appear with name
    "90210", // Zip codes alone might be OK
];

// -----------------------------------------------------------------------------
// 2. HELPER: assertNoPHIIn
// -----------------------------------------------------------------------------

/**
 * Recursively checks if any value in the obj contains PHI strings.
 * Throws an error (fails test) if PHI is found.
 */
function assertNoPHIIn(sinkName: string, payload: any) {
    if (!payload) return;

    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // 1. EXACT MATCHES
    const sensitiveValues = Object.values(FAKE_PHI_FIXTURE).filter(v => typeof v === 'string');
    for (const val of sensitiveValues) {
        // Skip short generic tokens if we decided they are safe-ish (like "M54.5" alone)
        // But generally, for this test, if "Jonathan Q. Patient-Doe" appears, it's a FAIL.
        if (str.includes(val)) {
            // Double check against allowlist if needed, but usually exact match of full fixture string is bad.
            throw new Error(`🚨 PHI LEAK DETECTED in [${sinkName}]: Found "${val}" in payload: ${str.slice(0, 200)}...`);
        }
    }

    // 2. REGEX PATTERNS (For partial leaks or formats)
    // Phone: 3-3-4
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(str)) {
        // Check if it matches our fixture phone strictly to avoid false positives on random IDs
        if (str.includes(FAKE_PHI_FIXTURE.phone)) {
            throw new Error(`🚨 PHI LEAK DETECTED in [${sinkName}]: Phone number found.`);
        }
    }

    // Email
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(str)) {
        if (str.includes(FAKE_PHI_FIXTURE.email)) {
            throw new Error(`🚨 PHI LEAK DETECTED in [${sinkName}]: Email found.`);
        }
    }
}

// -----------------------------------------------------------------------------
// 3. TESTS
// -----------------------------------------------------------------------------

test.describe('PHI Leak Guard', () => {
    let consoleSpy: { log: string[], error: string[], warn: string[] };
    let originalConsole: any;
    let supabaseMock: any;

    test.beforeAll(() => {
        // Setup environment for testing (disable actual DB calls if possible via Env)
        process.env.OPENAI_API_KEY = 'sk-fake-key-for-testing-phi-leaks'; // Ensure we don't hit real OpenAI
    });

    test.beforeEach(async () => {
        // --- SPY ON CONSOLE ---
        consoleSpy = { log: [], error: [], warn: [] };
        originalConsole = { ...console };

        console.log = (...args) => {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            consoleSpy.log.push(msg);
            // originalConsole.log('[TEST-SPY]', msg); // Uncomment to see logs during test run
        };
        console.error = (...args) => {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            consoleSpy.error.push(msg);
        };
        console.warn = (...args) => {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            consoleSpy.warn.push(msg);
        };

        // --- MOCK SUPABASE (Usually imported singleton) ---
        // Since we import the route handler, it uses the module-level 'supabase' instance.
        // We can't easily re-assign the import. 
        // HOWEVER, we can stick to 'checking the sinks we can control'.
        // If Supabase is called, it might fail if we don't mock the network call.
        // Better strategy: Mock GLOBAL FETCH, because Supabase JS client wraps fetch.

        // --- MOCK GLOBAL FETCH ---
        // This catches: Supabase calls, OpenAI calls, any 3rd party API calls.
        await setupGlobalFetchMock();
    });

    test.afterEach(() => {
        // Restore Console
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        // Restore Fetch (automatically handled by Playwright if we used context, but here we monkey-patched global)
        // @ts-ignore
        global.fetch = originalGlobalFetch;
    });

    let originalGlobalFetch: any;
    async function setupGlobalFetchMock() {
        // @ts-ignore
        originalGlobalFetch = global.fetch;
        // @ts-ignore
        global.fetch = async (url: string | Request, options: any) => {
            const urlStr = url.toString();
            const body = options?.body;

            // 🚨 CHECK FETCH SINK
            assertNoPHIIn(`HTTP POST to ${urlStr}`, body);
            assertNoPHIIn(`HTTP URL ${urlStr}`, urlStr);

            // Mock Responses to keep code running
            if (urlStr.includes('supabase')) {
                // Return dummy data for auth/queries
                return new Response(JSON.stringify({ data: [], error: null }), { status: 200 });
            }
            if (urlStr.includes('openai')) {
                return new Response(JSON.stringify({
                    choices: [{ message: { content: "Critique: No issues found. \n\n{}" } }]
                }), { status: 200 });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        };
    }

    // ===========================================================================
    // TEST CASE A: Pre-Auth API
    // ===========================================================================
    test('API /preauth should NOT log or leak PHI during execution', async () => {

        // Construct Request with PHI
        const reqBody = {
            clinicType: "Orthopedics",
            specialty: "Spine Surgery",
            payer: "BlueCross",
            patientRaw: {
                name: FAKE_PHI_FIXTURE.name,
                dob: FAKE_PHI_FIXTURE.dob,
                id: FAKE_PHI_FIXTURE.mrn,
                email: FAKE_PHI_FIXTURE.email
            },
            providerRaw: {
                npi: "1234567890", // Public info, okay
                clinicName: "Best Clinic"
            },
            extractedText: `
            CLINICAL NOTE
            Patient: ${FAKE_PHI_FIXTURE.name}
            DOB: ${FAKE_PHI_FIXTURE.dob_alt}
            Addr: ${FAKE_PHI_FIXTURE.address}
            
            History: ${FAKE_PHI_FIXTURE.clinical_note_snippet}
        `,
            cptCodes: ["22830"],
            icdCodes: [FAKE_PHI_FIXTURE.diagnosis_code]
        };

        // Create NextRequest
        const req = new NextRequest('http://localhost:3000/api/preauth', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                // Mock auth headers if needed by your middleware/context helpers
            },
            body: JSON.stringify(reqBody)
        });

        // Mock Context / Auth if needed
        // If usage of 'requireOrgAccess' inside route calls Supabase, our fakeFetch handles it.
        // If it mocks 'headers' for user ID, we might need to verify the implementation of requireOrgAccess.
        // For now, let's assume it calls Supabase to validate session.

        // execution
        const res = await preAuthHandler(req);
        const resJson = await res.json();

        // 1. Check RESPONSE Body (Should not echo back full PHI unless necessary, usually purely result)
        // The code returns "...auditData". Audit Data shouldn't generally have the raw patient inputs passed back 
        // unless strictly needed.
        // Ideally, we assert that the response doesn't contain the raw clinical note.
        assertNoPHIIn('API Response', resJson);


        // 2. Check LOGS (Console Spy)
        consoleSpy.log.forEach(msg => assertNoPHIIn('Console.log', msg));
        consoleSpy.error.forEach(msg => assertNoPHIIn('Console.error', msg));
        consoleSpy.warn.forEach(msg => assertNoPHIIn('Console.warn', msg));

        // 3. FETCH SPY was checked in real-time inside the mock

    });

    // ===========================================================================
    // TEST CASE B: Appeal API (If exists and similar)
    // ===========================================================================
    test('API /appeal should NOT log or leak PHI', async () => {
        // Create a dummy appeal request
        const reqBody = {
            appealType: "Medical Necessity",
            patientDetails: {
                name: FAKE_PHI_FIXTURE.name, // Inputting PHI
            },
            denialLetterText: `Dear ${FAKE_PHI_FIXTURE.name}, we denied your claim for ${FAKE_PHI_FIXTURE.diagnosis_code}.`,
            extractedText: `Patient: ${FAKE_PHI_FIXTURE.name}\nPHONE: ${FAKE_PHI_FIXTURE.phone}`,
        };

        const req = new NextRequest('http://localhost:3000/api/appeal', {
            method: 'POST',
            body: JSON.stringify(reqBody)
        });

        // We wrap in try/catch in case the route throws on our dummy data, 
        // but we still want to verify no leaks occurred UP TO the crash.
        try {
            await appealHandler(req);
        } catch (e) {
            // It's okay if it fails logic, as long as it didn't leak PHI in the process
            console.log("Appeal route threw error (expected due to mocks):", e);
        }

        // Check logs
        consoleSpy.log.forEach(msg => assertNoPHIIn('Console.log', msg));
        consoleSpy.error.forEach(msg => assertNoPHIIn('Console.error', msg));

        // Fetch was checked real-time
    });

});
