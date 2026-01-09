
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// High-Value Medicare NCDs (National Coverage Determinations)
const MEDICARE_POLICIES = [
    {
        cpt: 'NCD-220.5',
        title: 'Ultrasound Diagnostic Procedures',
        payer: 'Medicare',
        codes: ['76872', '76870', '76700'], // Mapped CPTs
        content: `
        MEDICARE NATIONAL COVERAGE DETERMINATION (NCD) 220.5
        
        Ultrasound diagnostic procedures are covered when medically necessary for the diagnosis or management of a patient's condition.
        
        SPECIFIC INDICATIONS for Prostate Ultrasound (76872):
        - Evaluation of palpable abnormalities (nodules).
        - Evaluation of elevated PSA (Prostate Specific Antigen).
        - Guidance for biopsy.
        - Staging of prostate carcinoma.
        
        LIMITATIONS:
        - Screening exams for prostate cancer are NOT covered under this NCD (See Screening Benefit).
        - Routine use without signs/symptoms is denied.
        `
    },
    {
        cpt: 'NCD-10.1',
        title: 'Use of Visual Tests Prior to and General Anesthesia During Cataract Surgery',
        payer: 'Medicare',
        codes: ['66984', '66982'],
        content: `
        MEDICARE NCD 10.1 - Cataract Surgery
        
        Cataract surgery with an intraocular lens (IOL) is covered when:
        1. The lens opacity impairs vision.
        2. The patient has a functional impairment due to the cataract (e.g., unable to drive, read).
        3. The patient has been educated on risks/benefits.
        `
    },
    {
        cpt: 'LCD-L33615',
        title: 'MRI of the Lumbar Spine',
        payer: 'Medicare',
        codes: ['72148', '72158'],
        content: `
        LOCAL COVERAGE DETERMINATION (LCD) L33615
        
        MRI of the Lumbar Spine is medically necessary for:
        1. Low back pain with radiculopathy (sciatica) persisting despite >4 weeks of conservative therapy.
        2. Suspicion of tumor, infection, or fracture ("Red Flags").
        3. Cauda Equina Syndrome (Emergency).
        4. Pre-operative planning for confirmed surgical candidates.
        
        CONSERVATIVE THERAPY REQUIREMENT:
        - NSAIDs, PT, or Activity Modification for at least 4 weeks is REQUIRED unless red flags are present.
        `
    }
];

const MEDICAID_POLICIES = [
    {
        cpt: 'MCAID-ORTHO-001',
        title: 'Knee Arthroscopy Guidelines',
        payer: 'Medicaid',
        codes: ['29881', '29880'],
        content: `
        MEDICAID COVERAGE POLICY: Knee Arthroscopy
        
        Arthroscopy for meniscus tear is covered ONLY if:
        1. MRI confirms tear.
        2. Mechanical symptoms (locking, catching) are documented.
        3. Failure of at least 3 MONTHS of conservative therapy (PT + Injections).
        
        NOT COVERED:
        - Primary diagnosis of osteoarthritis without mechanical symptoms.
        `
    }
];

async function seed() {
    console.log("🚀 Seeding CMS (Medicare/Medicaid) Data...");

    const allPolicies = [...MEDICARE_POLICIES, ...MEDICAID_POLICIES];

    for (const p of allPolicies) {
        console.log(`\n📄 Processing ${p.payer}: ${p.title} (${p.cpt})...`);

        // 1. Insert Policy
        const { data: policy, error } = await supabase
            .from('policies')
            .upsert({
                payer: p.payer,
                cpt_code: p.cpt,
                title: p.title,
                source_url: 'https://www.cms.gov/medicare-coverage-database/',
                status: 'active'
            }, { onConflict: 'payer, cpt_code, organization_id' })
            .select()
            .single();

        if (error) {
            console.error(`   ❌ Failed to insert policy: ${error.message}`);
            continue;
        }

        // 2. Insert Content
        await supabase.from('policy_sections').delete().eq('policy_id', policy.id);
        await supabase.from('policy_sections').insert({
            policy_id: policy.id,
            section_title: 'Clinical Guidelines',
            content: p.content,
            display_order: 1
        });

        // 3. Map CPT Codes (Many-to-Many)
        // This allows the AI to find "NCD-220.5" when looking for "76872"
        const codeInserts = p.codes.map(code => ({
            policy_id: policy.id,
            code: code,
            code_type: 'CPT'
        }));

        const { error: codeError } = await supabase
            .from('policy_codes')
            .upsert(codeInserts, { onConflict: 'policy_id, code, code_type' });

        if (codeError) console.error(`   ⚠️ Failed to map codes: ${codeError.message}`);
        else console.log(`   ✅ Mapped codes: ${p.codes.join(', ')}`);
    }

    console.log("\n🏁 CMS Seeding Complete.");
}

seed();
