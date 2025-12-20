
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function analyzeForm() {
    const filePath = path.join(process.cwd(), 'public', 'forms', 'texas_standard_prior_auth.pdf');
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\nAnalysis of: ${path.basename(filePath)}`);
    console.log(`Total Fields: ${fields.length}\n`);

    fields.forEach(f => {
        const type = f.constructor.name;
        const name = f.getName();
        console.log(`[${type}] ${name}`);
    });
}

analyzeForm().catch(console.error);
