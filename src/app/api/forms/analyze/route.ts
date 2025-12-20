
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        const form = pdfDoc.getForm();
        const fields = form.getFields().map(f => f.getName());

        return NextResponse.json({ fields });
    } catch (error) {
        console.error('PDF Analysis Error:', error);
        return NextResponse.json({ error: 'Failed to analyze PDF' }, { status: 500 });
    }
}
