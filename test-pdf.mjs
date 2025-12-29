// Quick test script for PDF parsing
import { extractText } from 'unpdf';

async function testPdfParse() {
    // Create a minimal test PDF
    const minimalPdf = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
        0x0A, 0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, // \n1 0 obj
        0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, // \n<</Type
        0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, // /Catalog
        0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, // >>\nendob
        0x6A, 0x0A, 0x25, 0x25, 0x45, 0x4F, 0x46         // j\n%%EOF
    ]);

    try {
        console.log('Testing unpdf library in Node.js environment...');
        const { text } = await extractText(minimalPdf);
        console.log('SUCCESS! Extracted text:', text || '(empty - expected for minimal PDF)');
        console.log('No DOMMatrix error - unpdf is working correctly!');
        process.exit(0);
    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    }
}

testPdfParse();
