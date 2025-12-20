
export function extractJSON(text: string): any {
    try {
        // 1. Try straightforward parse
        return JSON.parse(text);
    } catch (e) {
        // 2. Try to find markdown code blocks
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (e2) {
                // continuum
            }
        }

        // 3. Try finding the first { and last }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            try {
                return JSON.parse(text.slice(start, end + 1));
            } catch (e3) {
                // continuum
            }
        }

        throw new Error("Failed to extract JSON");
    }
}
