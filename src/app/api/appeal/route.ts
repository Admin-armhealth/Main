import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/aiClient';
import { getAppealPrompt, getCritiquePrompt } from '@/lib/prompts';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { logAudit } from '@/lib/logger';
import { validateOrgAccess } from '@/lib/auth';
import { requireOrgAccess } from '@/lib/server/authContext';
import { redactPHI } from '@/lib/privacy';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    try {
        // 🛡️ RATE LIMITING
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.AI_GENERATION);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded. Please try again later.',
                    retryAfter: rateLimitResult.retryAfter
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimitResult.retryAfter),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(rateLimitResult.resetIn)
                    }
                }
            );
        }

        const body = await req.json();
        const { denialReason, extractedText, cptCodes, icdCodes, patientRaw, providerRaw } = body;

        if (!denialReason || !extractedText) {
            return NextResponse.json({ error: 'Missing denialReason or extractedText' }, { status: 400 });
        }

        // Fetch templates
        let templates = undefined;
        if (providerRaw?.npi) {
            const { data: org } = await supabase
                .from('organizations')
                .select('templates')
                .eq('npi', providerRaw.npi)
                .maybeSingle();

            if (org?.templates) {
                templates = org.templates as any;
            }
        }

        // 1. Generate Appeal Letter
        const { systemPrompt, userPrompt } = getAppealPrompt({
            denialReason,
            extractedText: redactPHI(extractedText, patientRaw?.name), // 🔒 HIPAA Redaction
            cptCodes,
            icdCodes,
            patientRaw, // Warning: Ensure propmts don't leak this raw object if not needed. getAppealPrompt handles it?
            providerRaw,
            templates
        });

        const draft = await generateText({
            systemPrompt,
            userPrompt,
            temperature: 0.4,
        });

        // 2. Critique / Score the Appeal
        const { systemPrompt: critiqueSys, userPrompt: critiqueUser } = getCritiquePrompt({
            originalRequestParameters: body,
            generatedDraft: draft,
            isAppeal: true // IMPORTANT: Trigger Appeal Coding Rubric
        });

        const critiqueJson = await generateText({
            systemPrompt: critiqueSys,
            userPrompt: critiqueUser,
            temperature: 0,
            jsonMode: true
        });

        let auditData = {
            approval_likelihood: 0,
            confidence_level: "Low",
            checklist: [],
            missing_info: [],
            denial_risk_factors: []
        };

        try {
            const parsed = JSON.parse(critiqueJson.replace(/```json\n?|```/g, '').trim());
            // Safe unwrap of score if object
            let score = parsed.approval_likelihood ?? parsed.clinical_score ?? 0;
            if (typeof score === 'object') score = score.score || score.value || 0;

            const summary = parsed.appeal_summary || {};

            // 🛡️ APPEAL HARD GATES
            // Gate A: Denial Reason NOT addressed
            if (summary.denial_reason_addressed === false) {
                if (score > 25) {
                    score = 25;
                    console.log('🔴 HARD GATE: Capped Appeal Score at 25 (Denial Reason Not Addressed)');
                }
            }

            // Gate B: Weak Evidence for Medical Necessity
            if (denialReason.toLowerCase().includes('medical necessity') && summary.evidence_strength === 'weak') {
                if (score > 40) {
                    score = 40;
                    console.log('🟠 HARD GATE: Capped Appeal Score at 40 (Weak Evidence)');
                }
            }

            // Gate C: Irrelevant Evidence (e.g. Experimental vs PT)
            if (summary.evidence_strength === 'irrelevant') {
                if (score > 30) {
                    score = 30;
                    console.log('🔴 HARD GATE: Capped Appeal Score at 30 (Irrelevant Evidence)');
                }
            }

            // Gate D: Futile Appeal
            if (summary.appeal_recommended === false) {
                score = 0;
                console.log('🔴 HARD GATE: Appeal Blocked (Futile / Do Not Appeal)');
            }

            // 🛡️ DETERMINISTIC GUARD: Futile appeals must not be recommended
            if (score < 30) {
                summary.appeal_recommended = false;
                console.log('🔴 DETERMINISTIC GATE: Score < 30 → appeal_recommended forced to false');
            }

            auditData = { ...parsed, approval_likelihood: score, appeal_summary: summary };
        } catch (e) {
            console.error("Critique Parse Error:", e);
        }


        // 🛡️ SECURITY: SERVER-SIDE AUTH (Non-Spoofable)
        const authCtx = await requireOrgAccess('member');
        if (!authCtx.ok) {
            return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
        }
        const { userId, orgId } = authCtx;
        console.log(`✅ AUTH: User ${userId} in Org ${orgId}`);

        const result = draft; // Alias for consistency

        // 🔒 HIPAA: HISTORY DISABLED
        // We do NOT save to DB.

        return NextResponse.json({ result: draft, ...auditData });
    } catch (error) {
        console.error('Appeal API Error:', error);
        return NextResponse.json({ error: 'Failed to generate appeal letter' }, { status: 500 });
    }
}
