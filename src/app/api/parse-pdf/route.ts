import { NextRequest, NextResponse } from 'next/server';
import { parsePdfBuffer } from '@/lib/pdf';
import mammoth from 'mammoth';
import { generateText } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        let text = '';

        if (file.type === 'application/pdf') {
            text = await parsePdfBuffer(buffer);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // DOCX Handling
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }

        // Detect Scanned Documents (Empty or minimal text)
        const isScanned = text.replace(/\s/g, '').length < 50;

        // INTELLIGENCE LAYER: Auto-Extract Metadata
        // We do a quick AI pass to find Patient Name, DOB, ID, etc.
        let metadata = null;
        try {
            // Only try AI extraction if we actually have text
            if (!isScanned) {
                const prompt = `
                Extract the following patient data from this clinical text into JSON format:
                {
                   "patient": { "name": string | null, "dob": string | null (YYYY-MM-DD), "id": string | null },
                   "payer": string | null,
                   "provider": { "name": string | null, "npi": string | null }
                }
    
                Text:
                """
                ${text.substring(0, 3000)} 
                """
                // Truncated to 3000 chars to save tokens, usually header info is at top
                `;

                const jsonStr = await generateText({
                    systemPrompt: "You are a data extraction assistant. Return ONLY valid JSON.",
                    userPrompt: prompt,
                    temperature: 0,
                    jsonMode: true
                });

                const cleanJson = jsonStr.replace(/```json\n?|```/g, '').trim();
                metadata = JSON.parse(cleanJson);
            }
        } catch (e) {
            console.error("Auto-Fill Extraction Failed:", e);
            // Non-blocking error
        }

        return NextResponse.json({
            text: isScanned ? '' : text,
            metadata: {
                ...metadata,
                status: isScanned ? 'scanned_document' : 'digital_document'
            },
            requiresOCR: isScanned
        });
    } catch (error) {
        console.error('Parse Error:', error);
        return NextResponse.json({ error: 'Failed to extract text' }, { status: 500 });
    }
}
