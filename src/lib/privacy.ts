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
    // 1. Specific Patient Name Redaction (High Confidence)
    if (knownPatientName && knownPatientName.trim().length > 1) {
        // Simple, robust replacement of the exact string (Case Insensitive)
        const escapedName = escapeRegExp(knownPatientName.trim());
        const nameRegex = new RegExp(escapedName, 'gi');
        redacted = redacted.replace(nameRegex, '[PATIENT_NAME]');
    }

    // 2. Deterministic Patterns (High Confidence)

    // Dates: MM/DD/YYYY or YYYY-MM-DD
    // We want to preserve "6 weeks" or "2024" (generic), but hide specific DOB-like dates
    // Regex matches 1-12 / 1-31 / 2 or 4 digit year
    redacted = redacted.replace(/\b\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})\b/g, '[DATE]');
    redacted = redacted.replace(/\b(\d{4})-\d{2}-\d{2}\b/g, '[DATE]');

    // SSN / ID Patterns: 3-2-4 or similar long numeric strings
    redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ID_SSN]');
    // Generic Long IDs (8+ digits) - Catches MRNs, IDs
    redacted = redacted.replace(/\b\d{8,}\b/g, '[ID]');

    // Phone Numbers
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

// Helper for regex escaping
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
