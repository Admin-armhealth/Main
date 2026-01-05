// Test unpdf with mergePages option
import { extractText } from 'unpdf';
import fs from 'fs';

async function test() {
    const pdfPath = 'C:/Users/akiru/.gemini/antigravity/brain/69753781-b8db-4ed8-8db7-8e6c981f7646/test_clinical_notes.pdf';
    const buffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(buffer);

    console.log('Testing unpdf with mergePages: true...');
    const { text } = await extractText(uint8Array, { mergePages: true });

    console.log('Type of text:', typeof text);
    console.log('Text content:', text);
    console.log('\nSUCCESS - PDF parsing works!');
}

test().catch(e => {
    console.error('FAILED:', e.message);
    process.exit(1);
});
