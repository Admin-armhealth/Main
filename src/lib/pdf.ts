import { extractText } from 'unpdf';

/**
 * Parses a PDF buffer and extracts text using unpdf library.
 * unpdf is designed for serverless environments and doesn't
 * require Canvas/DOMMatrix browser APIs.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
    try {
        // unpdf requires Uint8Array, not Node.js Buffer
        const uint8Array = new Uint8Array(buffer);
        const { text } = await extractText(uint8Array);
        return text.trim();
    } catch (error) {
        console.error('PDF Parse Error:', error);
        throw new Error(`Failed to parse PDF document: ${error instanceof Error ? error.message : String(error)}`);
    }
}
