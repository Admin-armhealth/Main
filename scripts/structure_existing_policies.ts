
// scripts/structure_existing_policies.ts
// PURPOSE: "Compile" existing text policies into deterministic Policy Rules using AI.
// This runs once (or periodically), NOT at runtime.

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Setup Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST use Service Role to write to policy_rules
);

async function runExtraction() {
    console.log("🏗️  STARTING POLICY STRUCTURING ENGINE...");

    // 1. Get policies that have text but NO rules yet
    // (For simplicity we just grab all active policies and upsert rules, 
    // real prod would differentiate processed vs unprocessed).
    const { data: policies, error } = await supabase
        .from('policies')
        .select(`
            id, 
            cpt_code, 
            title, 
            policy_sections(content)
        `)
        .eq('status', 'active');

    if (error || !policies) {
        console.error("❌ Failed to fetch policies:", error);
        return;
    }

    console.log(`found ${policies.length} policies to process.`);

    // Dynamic import to avoid build issues with 'src' alias if any
    const { generateText } = await import('../src/lib/aiClient');

    for (const policy of policies) {
        console.log(`\n📄 Processing: ${policy.title} (${policy.cpt_code})`);

        // Combine all sections into one text blob
        const fullText = policy.policy_sections?.map((s: any) => s.content).join('\n\n') || "";

        // Strip HTML roughly
        const cleanText = fullText.replace(/<[^>]*>?/gm, ' ').substring(0, 15000); // Limit tokens

        if (cleanText.length < 50) {
            console.log("   ⚠️  Content too short. Skipping.");
            continue;
        }

        const systemPrompt = "You are a Medical Policy Structural Analyst. Extract deterministic logic rules from policy text.";
        const userPrompt = `
        TASK: Convert this Medical Policy text into a JSON array of Rules.
        
        OUTPUT FORMAT:
        [
          {
            "category": "String (e.g. 'Conservative Therapy', 'Imaging', 'Diagnosis', 'Contraindication')",
            "operator": "String (One of: 'MATCH_ONE', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS', 'EXISTS', 'NOT_EXISTS')",
            "value_json": "The value to check against (Number, String, or Array of Strings)",
            "failure_message": "User-friendly error message if this rule is not met (e.g. 'Patient must try PT for 6 weeks')"
          }
        ]
        
        RULES FOR EXTRACTION:
        1. Ignore definitions and coding tables. Focus on *Medical Necessity Criteria*.
        2. For lists of requirements (e.g. "ONE of the following"), use "MATCH_ONE" with an array of options.
        3. For durations (e.g. "6 weeks"), use "GREATER_THAN" or "LESS_THAN" with a Number.
        4. For specific test results (e.g. "PSA > 4.0"), convert to a rule.
        
        POLICY TEXT:
        """${cleanText}"""
        `;

        try {
            console.log("   🧠 Asking AI to structure rules...");
            const jsonStr = await generateText({
                systemPrompt,
                userPrompt,
                temperature: 0,
                jsonMode: true
            });

            // Parse response
            let rules: any[] = [];
            const parsed = JSON.parse(jsonStr);

            // Handle if AI returns { rules: [...] } or just [...]
            if (Array.isArray(parsed)) rules = parsed;
            else if (parsed.rules) rules = parsed.rules;

            console.log(`   ✅ Extracted ${rules.length} rules.`);

            // Insert into DB
            if (rules.length > 0) {
                // DELETE existing rules for this policy to avoid dupes/stale data (Re-compilation)
                await supabase.from('policy_rules').delete().eq('policy_id', policy.id);

                const inserts = rules.map(r => ({
                    policy_id: policy.id,
                    category: r.category,
                    operator: r.operator,
                    value_json: r.value_json,
                    failure_message: r.failure_message,
                    // Simple stable ID generation
                    rule_id: `${policy.cpt_code}-${r.category.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`
                }));

                const { error: insertError } = await supabase.from('policy_rules').insert(inserts);
                if (insertError) {
                    console.error("   ❌ DB Insert failed:", insertError.message);
                } else {
                    console.log("   💾 Saved to DB.");
                }
            }

        } catch (e: any) {
            console.error("   ❌ Extraction failed:", e.message);
        }
    }
}

runExtraction();
