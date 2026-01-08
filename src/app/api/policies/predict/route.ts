
import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    // Standard Supabase Client (for RLS context if needed, but here we read public/org policies)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { note, cptCode } = await request.json();

        if (!note || !cptCode) {
            return NextResponse.json({ error: 'Clinical Note and CPT Code are required' }, { status: 400 });
        }

        console.log(`🔍 Policies API: Checking CPT ${cptCode}...`);

        // 1. Lookup Policy ID via CPT
        const { data: codes, error: codeErr } = await supabase
            .from('policy_codes')
            .select`
                policy_id,
                policies (title, source_url)
            `
            .eq('code', cptCode)
            .limit(1);

        if (codeErr || !codes || codes.length === 0) {
            return NextResponse.json({
                error: `No policy found for CPT ${cptCode}. Please try a different code (e.g., 76872).`
            }, { status: 404 });
        }

        const policyId = codes[0].policy_id;
        const policyMeta = codes[0].policies;

        // 2. Fetch Policy Content (Rules)
        const { data: sections, error: sectErr } = await supabase
            .from('policy_sections')
            .select('content')
            .eq('policy_id', policyId)
            .limit(1);

        if (sectErr || !sections || sections.length === 0) {
            return NextResponse.json({ error: 'Policy found but content is missing.' }, { status: 500 });
        }

        const policyText = sections[0].content;

        // 3. Dynamic Import AI
        const { generateText } = await import('@/lib/aiClient');

        // 4. Run Analysis
        const systemPrompt = "You are a Medical Necessity Auditor. Compare the Clinical Note against the Policy Document.";
        const userPrompt = `
        [POLICY SOURCE]
        Title: ${(policyMeta as any).title}
        URL: ${(policyMeta as any).source_url}

        [POLICY TEXT HTML]
        ${policyText.substring(0, 25000)} ... (truncated)
        
        [CLINICAL NOTE]
        """${note}"""
        
        [TASK]
        Determine if the request meets the medical necessity criteria outlined in the policy.
        RETURN JSON ONLY.
        
        RESPONSE FORMAT (JSON):
        {
           "overall_status": "APPROVED" | "DENIED" | "MISSING_INFO",
           "analysis": [
              {
                 "rule_id": "string (short summary of criteria)",
                 "met": boolean,
                 "evidence": "string (quote from note) or 'Not found'"
              }
           ],
           "missing_info": ["list of specific things missing"]
        }
        `;

        const jsonStr = await generateText({
            systemPrompt,
            userPrompt,
            temperature: 0,
            jsonMode: true
        });

        const analysis = JSON.parse(jsonStr.replace(/```json\\n?|```/g, '').trim());

        return NextResponse.json({ success: true, analysis });

    } catch (e: any) {
        console.error("Prediction Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
