// Polyfill DOMMatrix for serverless environments (Vercel, etc.)
// pdfjs-dist requires Canvas API which doesn't exist in Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
    // @ts-ignore - Minimal polyfill for text extraction only
    globalThis.DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        m11 = 1; m12 = 0; m13 = 0; m14 = 0;
        m21 = 0; m22 = 1; m23 = 0; m24 = 0;
        m31 = 0; m32 = 0; m33 = 1; m34 = 0;
        m41 = 0; m42 = 0; m43 = 0; m44 = 1;
        is2D = true;
        isIdentity = true;
        constructor(init?: string | number[]) {
            if (Array.isArray(init) && init.length >= 6) {
                this.a = this.m11 = init[0];
                this.b = this.m12 = init[1];
                this.c = this.m21 = init[2];
                this.d = this.m22 = init[3];
                this.e = this.m41 = init[4];
                this.f = this.m42 = init[5];
            }
        }
        multiply() { return new DOMMatrix(); }
        inverse() { return new DOMMatrix(); }
        translate() { return new DOMMatrix(); }
        scale() { return new DOMMatrix(); }
        rotate() { return new DOMMatrix(); }
        flipX() { return new DOMMatrix(); }
        flipY() { return new DOMMatrix(); }
        transformPoint(point: any) { return point || { x: 0, y: 0, z: 0, w: 1 }; }
        toFloat32Array() { return new Float32Array(16); }
        toFloat64Array() { return new Float64Array(16); }
    };
}

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
