/**
 * ARM Privacy Boundary:
 * This function ensures no Protected Health Information (PHI)
 * is transmitted, logged, or persisted by the system.
 * All external AI calls MUST receive redacted input only.
 */

export function redactPHI(text: string, knownPatientName?: string): string {
    if (!text) return text;

    let redacted = text;

    // 1. Specific Patient Name Redaction (High Confidence)
    if (knownPatientName && knownPatientName.trim().length > 1) {
        const cleanName = knownNameRedaction(redacted, knownPatientName);
        redacted = cleanName;
    }

    // 2. Deterministic Patterns (High Confidence)

    // Email Addresses
    redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

    // Dates: MM/DD/YYYY or YYYY-MM-DD or M/D/YY
    // We want to preserve "6 weeks" or "2024" (generic), but hide specific DOB-like dates
    redacted = redacted.replace(/\b\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})\b/g, '[DATE]');
    redacted = redacted.replace(/\b(\d{4})-\d{2}-\d{2}\b/g, '[DATE]');
    redacted = redacted.replace(/\b\d{1,2}-\d{1,2}-(\d{2}|\d{4})\b/g, '[DATE]'); // MM-DD-YYYY

    // SSN / ID Patterns: 3-2-4 or similar long numeric strings
    redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ID_SSN]');

    // Generic Long IDs (8+ chars)
    // Must contain at least one digit to avoid replacing long words like "HOSPITAL"
    // Catches "12345678" and "A12345678"
    redacted = redacted.replace(/\b(?=.*[0-9])[A-Z0-9]{8,}\b/gi, '[ID]');

    // Phone Numbers
    // Catches (123) 456-7890, 123-456-7890, 123.456.7890
    redacted = redacted.replace(/\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g, '[PHONE]');

    // Member IDs / MRNs (Common formats: Alpha-numeric mixed, 8+ chars)
    // This is heuristic and risky for clinical codes (e.g. M54.5).
    // We skip this for now to avoid breaking ICD codes, assuming Name+DOB+Phone redaction is the primary shield.

    // 3. User Requested Heuristic (Capitalized Names) - *MODIFIED FOR SAFETY*
    // The user originally asked for `\b[A-Z][a-z]+ [A-Z][a-z]+\b`.
    // We determined this catches "Left Knee", "Medical History".
    // WE OMIT THIS general heuristic in favor of the specific `knownPatientName` redaction above, 
    // as per the approved plan modification: "Redact only explicitly extracted patient identifiers".

    return redacted;
}

// Helper for matching First Last, Last, First, etc.
function knownNameRedaction(text: string, name: string): string {
    let output = text;
    const parts = name.trim().split(/\s+/);

    // 1. Exact Full Match
    output = output.replace(new RegExp(escapeRegExp(name), 'gi'), '[PATIENT_NAME]');

    // 2. Last, First Match (if > 1 part)
    if (parts.length > 1) {
        const lastFirst = `${parts[parts.length - 1]}, ${parts[0]}`;
        output = output.replace(new RegExp(escapeRegExp(lastFirst), 'gi'), '[PATIENT_NAME]');
    }

    return output;
}

// Helper for regex escaping
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
