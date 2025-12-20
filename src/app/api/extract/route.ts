import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        const systemPrompt = `You are a medical data extraction assistant. Extract structured data from the provided clinical text.
Return a valid JSON object with the following structure:
{
  "patient": { "name": "string", "id": "string", "dob": "YYYY-MM-DD" },
  "provider": { "name": "string", "npi": "string", "clinicName": "string" },
  "payer": "string",
  "cpt": ["string (CPT, HCPCS, or J-Codes)"],
  "icd": ["string"]
}
If a field is not found, omit it.`;

        const userPrompt = `CLINICAL TEXT:\n"""\n${text}\n"""`;

        const jsonStr = await generateText({
            systemPrompt,
            userPrompt,
            temperature: 0,
            jsonMode: true
        });

        const data = JSON.parse(jsonStr.replace(/```json\n?|```/g, '').trim());

        return NextResponse.json(data);

    } catch (error) {
        console.error('Extract Error:', error);
        return NextResponse.json({ error: 'Failed to extract data' }, { status: 500 });
    }
}
