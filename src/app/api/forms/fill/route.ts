
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { templateName, fieldValues, customFileBase64 } = body;

        let pdfBytes: Uint8Array;

        // Load PDF (Library or Custom)
        if (customFileBase64) {
            const buffer = Buffer.from(customFileBase64, 'base64');
            pdfBytes = new Uint8Array(buffer);
        } else if (templateName) {
            const filePath = path.join(process.cwd(), 'public', 'forms', templateName);
            if (!fs.existsSync(filePath)) {
                return NextResponse.json({ error: 'Template not found' }, { status: 404 });
            }
            pdfBytes = fs.readFileSync(filePath);
        } else {
            return NextResponse.json({ error: 'Missing template source' }, { status: 400 });
        }

        // Load & Fill
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        for (const [key, value] of Object.entries(fieldValues)) {
            try {
                const field = form.getField(key);
                if (field) {
                    const type = field.constructor.name;
                    // Handle Text Fields
                    if (type === 'PDFTextField') {
                        try {
                            // @ts-ignore - pdf-lib types can be finicky, explicit check + cast
                            field.setText(String(value));
                        } catch (e) { }
                    }
                    // Handle Checkboxes
                    else if (type === 'PDFCheckBox') {
                        if (String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes') {
                            try {
                                // @ts-ignore
                                field.check();
                            } catch (e) { }
                        }
                    }
                }
            } catch (e) {
                console.warn(`Field ${key} not found or error filling:`, e);
            }
        }

        const filledPdfBytes = await pdfDoc.save();

        const buffer = Buffer.from(filledPdfBytes);
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="filled_form.pdf"',
            },
        });

    } catch (error) {
        console.error('PDF Fill Error:', error);
        return NextResponse.json({ error: 'Failed to fill PDF' }, { status: 500 });
    }
}
