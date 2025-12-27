
export interface CritiqueResult {
    clinical_score: number;
    approval_likelihood: number;
    admin_score: number;
    overall_status: string;
    score_band: string;
    score_band_label: string;
    delta_to_next_band: number;
    next_band: string;
    simulated_verdict: string;
    primary_risk_factor: any;
    clinical_evidence_assessment: any;
    confidence_level: number;
    checklist: any[];
    missing_info: string[];
    denial_risk_factors: any[];
    [key: string]: any;
}

export interface AppliedScoringResult {
    auditData: CritiqueResult;
    logs: string[];
}

export function applyScoringGuardrails(
    critique: any,
    specialty: string | undefined
): AppliedScoringResult {
    const logs: string[] = [];
    const normalizedSpecialty = specialty ? specialty.toLowerCase() : 'general';
    console.log('DEBUG INTERNAL: Specialty:', normalizedSpecialty);

    let finalClinicalScore = critique.clinical_score ?? critique.approval_likelihood;
    let finalOverallStatus = critique.overall_status;
    let finalScoreBand = critique.score_band;
    const evidence = critique.clinical_evidence_assessment || {};

    // ---------------------------------------------------------
    // 🛡️ ENTERPRISE HARDENING: DETERMINISTIC SAFETY GATES
    // ---------------------------------------------------------

    // 1. Mismatch Kill Switch (Zero Tolerance)
    // Relies on GPT-4o identifying the specific type.
    const isMismatch = critique.primary_risk_factor?.type === 'clinical_mismatch';

    // Secondary Safeguard: Only trigger text match on specific POSITIVE assertions
    const riskFactors = critique.denial_risk_factors || [];
    const hasExplicitMismatch = riskFactors.some((r: any) => {
        const text = (typeof r === 'string' ? r : r.risk).toLowerCase();
        // Check for "Mismatch found" or similar positive constraints, avoiding "No mismatch"
        return (text.includes('body site mismatch') || text.includes('laterality mismatch')) &&
            !text.includes('no body site mismatch') && !text.includes('no laterality mismatch');
    });

    if (isMismatch || hasExplicitMismatch) {
        finalClinicalScore = 0;
        finalOverallStatus = 'blocked';
        finalScoreBand = 'likely_denial';
        logs.push('🔴 HARD GATE: Blocked due to Clinical Mismatch');
    }

    // ---------------------------------------------------------
    // 🦷 DENTAL SPECIFIC GATES (Only for Dentistry)
    // ---------------------------------------------------------
    if (normalizedSpecialty === 'dentistry') {
        const checklist = critique.checklist || [];

        // Check for Tooth Numbers
        const hasToothNumber = checklist.some((item: any) =>
            item.label.toLowerCase().includes('tooth number') && item.status === 'PASS'
        );

        // Check for X-Rays / Radiographs
        const hasXRays = checklist.some((item: any) =>
            (item.label.toLowerCase().includes('x-ray') || item.label.toLowerCase().includes('radiograph'))
            && item.status === 'PASS'
        );

        if (!hasToothNumber) {
            if (finalClinicalScore > 50) {
                finalClinicalScore = 50;
                finalOverallStatus = 'blocked';
                finalScoreBand = 'high_risk';
                logs.push('🟠 DENTAL GATE: Capped score at 50 due to Missing Tooth Number');
                critique.missing_info.push("Specific Tooth Number (1-32) is required.");
            }
        }
    }
    // ---------------------------------------------------------
    // 🦴 ORTHOPEDIC / GENERAL GATES (Ignored for Dental)
    // ---------------------------------------------------------
    else if (normalizedSpecialty === 'orthopedics' || normalizedSpecialty === 'pain management') {
        // 2. Vague Logic Cap (Calibration) for PT/Conservative Therapy
        // If PT is present but duration is missing/vague (< 6 weeks) OR strength is 'weak'/'missing'
        // We cap the score at 35 to prevent "Human-like Optimism".
        if (evidence.conservative_therapy?.present &&
            (evidence.conservative_therapy?.duration_weeks < 6 || evidence.conservative_therapy?.strength !== 'strong')) {

            console.log('DEBUG INTERNAL: Ortho Triggered. Score:', finalClinicalScore, 'Weeks:', evidence.conservative_therapy?.duration_weeks);

            // Only enforce cap if score is unreasonably high
            if (finalClinicalScore > 35) {
                finalClinicalScore = 35;
                finalOverallStatus = 'blocked'; // Explicitly block vague cases
                finalScoreBand = 'likely_denial';
                logs.push('🟠 ORTHO GATE: Capped score at 35 due to Vague Therapy Duration');
            }
        }
    }

    // Construct the updated Audit Data
    const auditData: CritiqueResult = {
        ...critique,
        approval_likelihood: finalClinicalScore,
        clinical_score: finalClinicalScore, // Use gated score
        overall_status: finalOverallStatus, // Use gated status
        score_band: finalScoreBand, // Use gated band
    };

    return { auditData, logs };
}
