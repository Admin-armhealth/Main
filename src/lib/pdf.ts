
import { PDFDocumentProxy } from 'pdfjs-dist';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';

/**
 * Parses a PDF buffer and extracts text using Mozilla's pdf.js library.
 * This replaces the older 'pdf-parse' library which had compatibility issues.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
    // Fix for Next.js/Node.js environment: explicilty point to the worker
    // to avoid "Setting up fake worker failed" errors in bundlers.
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    }

    try {
        // Convert Buffer to Uint8Array as expected by PDF.js
        const uint8Array = new Uint8Array(buffer);

        // Load the document using the legacy build (compatible with Node.js)
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useSystemFonts: true,
            disableFontFace: true,
            // standard font data is sometimes needed
        });

        const doc: PDFDocumentProxy = await loadingTask.promise;
        const numPages = doc.numPages;
        let fullText = '';

        // Extract text from each page
        for (let i = 1; i <= numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();

            // Join text items with space to reconstruct lines/sentences
            const pageText = textContent.items
                // @ts-ignore
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    } catch (error) {
        console.error('PDF Parse Error:', error);
        // Enhance error message for better debugging
        throw new Error(`Failed to parse PDF document: ${error instanceof Error ? error.message : String(error)}`);
    }
}
