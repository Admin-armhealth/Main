
import fs from 'fs';
import path from 'path';
import { parsePdfBuffer } from '../src/lib/pdf';

async function verify() {
    const pdfPath = path.join(process.cwd(), 'sample_clinical_notes.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error('Test PDF not found:', pdfPath);
        process.exit(1);
    }

    const buffer = fs.readFileSync(pdfPath);
    console.log(`Verifying fix with ${pdfPath} (${buffer.length} bytes)...`);

    try {
        const text = await parsePdfBuffer(buffer);
        if (text.length > 100) {
            console.log('✅ SUCCESS: PDF parsed successfully.');
            console.log('Extracted Text Preview:', text.substring(0, 100).replace(/\n/g, ' '));
            process.exit(0);
        } else {
            console.error('❌ FAILURE: Parsed text is too short or empty.');
            process.exit(1);
        }
    } catch (e) {
        console.error('❌ FAILURE: Parsing threw an error:', e);
        process.exit(1);
    }
}

verify();
