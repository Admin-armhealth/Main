/**
 * Parses a PDF buffer and extracts text using pdf-parse library.
 * This library is designed for Node.js/serverless environments
 * and doesn't require Canvas/DOMMatrix browser APIs.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
    try {
        // Dynamic import to avoid build-time loading issues
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        return data.text.trim();
    } catch (error) {
        console.error('PDF Parse Error:', error);
        throw new Error(`Failed to parse PDF document: ${error instanceof Error ? error.message : String(error)}`);
    }
}
