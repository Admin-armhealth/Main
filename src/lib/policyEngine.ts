
// src/lib/policyEngine.ts
// PURPOSE: Deterministic Verification Engine.
// Compares "structured facts" (from Note) against "structured rules" (from DB).

import { createClient } from '@supabase/supabase-js';
import { generateText } from './aiClient';

// Initialize Supabase Client (Service Role for reading rules securely if needed, or Anon if RLS permits)
// We'll use the service role key if available server-side, or falling back to public envs 
// (Note: In a Next.js library, we often just use standard creation. 
// Assuming this runs server-side in API routes).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface PolicyRule {
    id: string;
    category: string;
    operator: 'MATCH_ONE' | 'MATCH_ALL' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'EXISTS' | 'NOT_EXISTS';
    value_json: any;
    failure_message: string;
    rule_id?: string;
}

export interface VerificationResult {
    overall_status: 'APPROVED' | 'DENIED' | 'MISSING_INFO';
    analysis: RuleResult[];
    missing_info: string[];
}

export interface RuleResult {
    rule_id: string;
    category: string;
    met: boolean;
    evidence: string; // Quote from note or "Not found"
    failure_message?: string;
}

export class PolicyEngine {

    /**
     * Main Entry Point: Verify a note against a specific CPT policy.
     */
    static async verify(cptCode: string, noteText: string): Promise<VerificationResult> {
        console.log(`🛡️ PolicyEngine: Verifying CPT ${cptCode}...`);

        // 1. Fetch Policy & Rules
        const { data: policies } = await supabase
            .from('policies')
            .select(`
                id, 
                title,
                policy_rules(*)
            `)
            .eq('cpt_code', cptCode) // Assuming strictly one policy per CPT for now, or use complex matching
            .eq('status', 'active'); // Only active policies

        const policy = policies?.[0];

        if (!policy || !policy.policy_rules || policy.policy_rules.length === 0) {
            console.warn("⚠️ No structured policy found. Falling back to simple AI check?");
            // For V1, if no rules, we return MISSING_INFO saying "No digital policy available".
            return {
                overall_status: 'MISSING_INFO',
                analysis: [],
                missing_info: [`No structured policy rules found for CPT ${cptCode}. Please contact admin.`]
            };
        }

        const rules: PolicyRule[] = policy.policy_rules;
        console.log(`   Found ${rules.length} active rules.`);

        // 2. Extract Facts from Note (AI)
        // We optimize by asking for exactly the categories present in the rules.
        const categories = [...new Set(rules.map(r => r.category))];

        const facts = await this.extractFacts(noteText, categories);

        // 3. Logic Engine Comparison
        const analysis: RuleResult[] = [];
        let denied = false;
        let missing = false;

        for (const rule of rules) {
            // Find corresponding fact
            // AI returns facts keyed by category, e.g. { "Conservative Therapy": { value: "2 weeks", found: true, quote: "..." } }
            const fact = facts[rule.category];

            const result = this.evaluateRule(rule, fact);
            analysis.push(result);

            if (!result.met) {
                denied = true; // Any failure = Denial Risk (strict)
            }
        }

        return {
            overall_status: denied ? 'DENIED' : 'APPROVED',
            analysis,
            missing_info: denied ? analysis.filter(r => !r.met).map(r => r.failure_message || "Requirement not met") : []
        };
    }

    /**
     * Uses AI to extract structured data for specific categories.
     * This is the "Clinical NLP" layer.
     */
    private static async extractFacts(noteText: string, categories: string[]): Promise<Record<string, any>> {
        const systemPrompt = "You are a Clinical Data Extractor. Extract specific values for the requested categories.";
        const userPrompt = `
        TASK: properties from the Clinical Note for the following categories: ${categories.join(', ')}.
        
        CLINICAL NOTE:
        """${noteText}"""
        
        OUTPUT JSON SCHEMA:
        {
           "[Category Name]": {
              "value": "extracted value (number for durations/quantities, string for others)",
              "found": boolean,
              "quote": "exact quote from text"
           }
        }
        
        EXAMPLE OUTPUT:
        {
          "Conservative Therapy": { "value": 6, "found": true, "quote": "tried PT for 6 weeks" },
          "Imaging": { "value": "MRI shows herniation", "found": true, "quote": "MRI L4-L5 herniation" }
        }
        `;

        try {
            const jsonStr = await generateText({
                systemPrompt,
                userPrompt,
                temperature: 0,
                jsonMode: true
            });
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Fact extraction failed", e);
            return {};
        }
    }

    /**
     * Deterministic Comparison Logic
     */
    private static evaluateRule(rule: PolicyRule, fact: any): RuleResult {
        const result: RuleResult = {
            rule_id: rule.rule_id || rule.id,
            category: rule.category,
            met: false,
            evidence: fact?.found ? fact.quote : "Not found in documentation",
            failure_message: rule.failure_message
        };

        if (!fact || !fact.found) {
            // Fact not found. 
            // If operator is NOT_EXISTS, this is good! 
            if (rule.operator === 'NOT_EXISTS') {
                result.met = true;
                result.evidence = "Correctly absent";
            } else {
                result.met = false;
                result.evidence = "Not mentioned in note";
            }
            return result;
        }

        // Logic Switch
        // Fact.value is what the AI extracted. Rule.value_json is the threshold.
        const factVal = fact.value;
        const ruleVal = rule.value_json;

        try {
            switch (rule.operator) {
                case 'GREATER_THAN':
                    // Assume numbers. AI might return "6 weeks", need robust parsing if not pure number.
                    // For V1, we trust AI extracted a number or we parseInt it.
                    const fNum = parseFloat(String(factVal).replace(/[^0-9.]/g, ''));
                    const rNum = parseFloat(String(ruleVal));
                    result.met = fNum > rNum;
                    break;

                case 'LESS_THAN':
                    const fNumL = parseFloat(String(factVal).replace(/[^0-9.]/g, ''));
                    const rNumL = parseFloat(String(ruleVal));
                    result.met = fNumL < rNumL;
                    break;

                case 'MATCH_ONE':
                    // ruleVal is ["NSAIDs", "PT"]. factVal might be "Ibuprofen" (tricky) or AI standardized it.
                    // For V1, we ask AI to extract into standard terms? Or we do fuzzy match here?
                    // Simpler: Rule says "NSAIDs", Fact says "NSAIDs".
                    // If ruleVal is array:
                    if (Array.isArray(ruleVal)) {
                        result.met = ruleVal.some(v => String(factVal).toLowerCase().includes(v.toLowerCase()));
                    } else {
                        result.met = String(factVal).toLowerCase().includes(String(ruleVal).toLowerCase());
                    }
                    break;

                case 'CONTAINS':
                    result.met = String(factVal).toLowerCase().includes(String(ruleVal).toLowerCase());
                    break;

                case 'EXISTS':
                    result.met = true; // implied by fact.found check above
                    break;

                case 'NOT_EXISTS':
                    // If we are here, fact.found is true. So we FAILED the NOT_EXISTS check.
                    result.met = false;
                    result.evidence = `Found forbidden content: ${fact.quote}`;
                    break;

                default:
                    console.warn(`Unknown operator ${rule.operator}`);
                    result.met = false;
            }
        } catch (err) {
            console.error(`Logic error comparing ${factVal} vs ${ruleVal}`, err);
            result.met = false;
            result.evidence = "Error verifying rule";
        }

        return result;
    }
}
