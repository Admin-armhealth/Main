
import { NextResponse } from 'next/server';
import { generateText } from '@/lib/aiClient';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, fields } = body;

        if (!text || !fields) {
            return NextResponse.json({ error: 'Missing text or fields' }, { status: 400 });
        }

        const systemPrompt = `You are a medical data extraction assistant. 
        Your task is to extract specific information from clinical notes to fill a PDF form.
        
        Rules:
        1. You will be given a list of Target Field Names (from a PDF).
        2. You must find the best matching data in the Clinical Notes.
        3. **MEDICAL CODING**: If a field asks for 'Diagnosis' or 'ICD', convert the condition to a standard ICD-10 code (e.g., 'Low Back Pain' -> 'M54.5').
        4. **MEDICAL CODING**: If a field asks for 'Procedure' or 'CPT', convert the service to a standard CPT code (e.g., 'Epidural' -> '62323').
        5. If a field is not found, return an empty string or "N/A".
        6. Return ONLY a valid JSON object.
        `;

        const userPrompt = `
        Target Fields: ${JSON.stringify(fields)}
        
        Clinical Notes:
        ${text}
        `;

        const responseHash = await generateText({
            systemPrompt,
            userPrompt,
            jsonMode: true,
            temperature: 0.1
        });

        // Parse extracted JSON
        let data = {};
        try {
            data = JSON.parse(responseHash);
        } catch (e) {
            console.error('Failed to parse AI JSON', responseHash);
            return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('AI Extraction Error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
