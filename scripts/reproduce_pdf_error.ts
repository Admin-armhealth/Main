
import fs from 'fs';
import path from 'path';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
    try {
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useSystemFonts: true,
            disableFontFace: true,
        });

        const doc = await loadingTask.promise;
        const numPages = doc.numPages;
        let fullText = '';

        for (let i = 1; i <= numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                // @ts-ignore
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    } catch (error) {
        console.error('PDF Parse Error:', error);
        throw error;
    }
}

async function run() {
    const pdfPath = path.join(process.cwd(), 'sample_clinical_notes.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error('Test PDF not found:', pdfPath);
        process.exit(1);
    }

    const buffer = fs.readFileSync(pdfPath);
    console.log(`Parsing ${pdfPath} (${buffer.length} bytes) with pdfjs-dist...`);

    try {
        const text = await parsePdfBuffer(buffer);
        console.log('Success! Extracted Text Length:', text.length);
        console.log('Snippet:', text.substring(0, 100));
    } catch (e) {
        console.error('Reproduction Script Failed:', e);
        process.exit(1);
    }
}

run();
