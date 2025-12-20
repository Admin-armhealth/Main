import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
    try {
        const { text, url } = await req.json();
        let contentToAnalyze = text;

        if (!contentToAnalyze && url) {
            try {
                // Feature: Pull from Web
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch URL');
                const html = await res.text();

                // Simple HTML cleanup (MVP Scraper)
                // Remove scripts, styles, and tags
                contentToAnalyze = html
                    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

            } catch (e) {
                return NextResponse.json({ error: `Could not fetch URL: ${url}` }, { status: 400 });
            }
        }

        if (!contentToAnalyze || contentToAnalyze.length < 50) {
            return NextResponse.json({ error: 'No content found. Please provide text or a valid URL.' }, { status: 400 });
        }

        // INTELLIGENCE: Extract Rules
        const systemPrompt = `You are a Clinical Policy Analyst.
Target: Extract strict medical necessity criteria from the provided insurance policy text.
Format: Return JSON only.`;

        const userPrompt = `
Analyze the following text and extract:
1. Payer Name (if mentioned, else null)
2. CPT Codes (list)
3. "policy_content": A concise bulleted list of requirements suitable for a doctor's checklist.

Text:
"""
${contentToAnalyze.substring(0, 10000)}
"""

JSON Structure:
{
  "payer": "string",
  "cpt_codes": ["string"],
  "title": "string",
  "policy_content": "string (markdown bullets)"
}`;

        const jsonStr = await generateText({
            systemPrompt,
            userPrompt,
            temperature: 0,
            jsonMode: true
        });

        const extracted = JSON.parse(jsonStr.replace(/```json\n?|```/g, '').trim());

        return NextResponse.json({ extracted });

    } catch (error) {
        console.error('Policy Import Failed:', error);
        return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
    }
}
