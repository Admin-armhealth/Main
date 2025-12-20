import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { generateText } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('pdf') as File;
        const sourceText = formData.get('sourceText') as string;

        if (!file || !sourceText) {
            return NextResponse.json({ error: 'Missing PDF file or source text' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();
        const fields = form.getFields().map(f => {
            const type = f.constructor.name;
            return { name: f.getName(), type };
        });

        // Prompt AI to map data
        const systemPrompt = `You are a data entry assistant. Map the provided CLINICAL TEXT to the PDF FORM FIELDS.
Return a valid JSON object where keys are the exact Field Names provided and values are the extracted data.
If a field cannot be filled from the text, omit it or use "N/A".
For Checkboxes, return "true" if it should be checked.`;

        const userPrompt = `
FORM FIELDS:
${JSON.stringify(fields.map(f => f.name), null, 2)}

CLINICAL TEXT:
"""
${sourceText}
"""

`;

        const jsonStr = await generateText({
            systemPrompt,
            userPrompt,
            temperature: 0,
            jsonMode: true
        });

        const mapping = JSON.parse(jsonStr.replace(/```json\n?|```/g, '').trim());

        // Apply mapping to form
        for (const [key, value] of Object.entries(mapping)) {
            try {
                const field = form.getField(key);
                if (value === 'true' && field.constructor.name === 'PDFCheckBox') {
                    (field as any).check();
                } else if (value && field.constructor.name === 'PDFTextField') {
                    (field as any).setText(String(value));
                }
            } catch (e) {
                // Field might not exist or be incompatible
                console.warn(`Could not set field ${key}:`, e);
            }
        }

        const pdfBytes = await pdfDoc.save();

        // Return PDF file
        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="filled-form.pdf"',
            },
        });

    } catch (error) {
        console.error('Form Fill Error:', error);
        return NextResponse.json({ error: 'Failed to process form' }, { status: 500 });
    }
}
