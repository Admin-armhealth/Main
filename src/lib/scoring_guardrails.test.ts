
import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { applyScoringGuardrails } from './scoring_guardrails';

describe('applyScoringGuardrails', () => {
    // Helper to generate mock critique object
    const createMockCritique = (clinical_score = 80, body_part = "Knee", cpt_code = "29881") => ({
        clinical_score,
        approval_likelihood: clinical_score,
        reasoning: "Met criteria",
        clinical_evidence_assessment: {
            conservative_therapy: { present: true, duration_weeks: 8, strength: "strong" },
            imaging: { present: true, findings: "Meniscal tear" },
            physical_exam: { present: true, findings: "Locking" },
            functional_status: { present: true, impact: "Cannot walk" }
        },
        risk_assessment: {
            primary_risk_factor: { type: "none", severity: "low" }
        },
        primary_risk_factor: { type: "none", severity: "low" }, // Added top-level to match interface
        cpt_consistency: {
            consistent: true,
            procedure_body_part: body_part,
            notes_body_part: body_part
        },
        denial_risk_factors: [],
        checklist: [] as any[], // Explicitly type as array
        missing_info: []
    });

    it('should cap score at 35 if Ortho therapy duration is vague (<6 weeks)', () => {
        const critique = createMockCritique(80);
        critique.clinical_evidence_assessment.conservative_therapy.duration_weeks = 2; // Too short

        const result = applyScoringGuardrails(critique, 'Orthopedics');

        // console.log('DEBUG Test Result:', JSON.stringify(result, null, 2));
        assert.ok(result.auditData.clinical_score <= 35, `Score should be <= 35, got ${result.auditData.clinical_score}. Logs: ${JSON.stringify(result.logs)}`);
        assert.strictEqual(result.auditData.overall_status, 'blocked');
        assert.match(JSON.stringify(result.logs), /ORTHO GATE/);
    });

    it('should cap score at 0 if Body Site Mismatch (Mismatch Kill Switch)', () => {
        const critique = createMockCritique(90, "Knee");
        critique.cpt_consistency.notes_body_part = "Shoulder"; // Mismatch
        critique.cpt_consistency.consistent = false;
        critique.primary_risk_factor = { type: 'clinical_mismatch', severity: 'critical' }; // Top level override

        const result = applyScoringGuardrails(critique, 'Orthopedics');

        assert.strictEqual(result.auditData.clinical_score, 0);
        assert.strictEqual(result.auditData.overall_status, 'blocked');
        assert.match(JSON.stringify(result.logs), /HARD GATE/); // "HARD GATE" is the actual log string in guardrails.ts
    });

    it('should cap score at 50 if Dental Tooth Number is missing', () => {
        const critique = createMockCritique(85);
        // Simulate missing tooth number failure in checklist
        critique.checklist = [{ label: "Tooth Number", status: "FAIL" }];

        const result = applyScoringGuardrails(critique, 'Dentistry');

        assert.ok(result.auditData.clinical_score <= 50, `Dental score should be <= 50, got ${result.auditData.clinical_score}`);
        assert.match(JSON.stringify(result.logs), /DENTAL GATE/);
    });

    it('should allow high score if all criteria met (Orthopedics)', () => {
        const critique = createMockCritique(88);
        const result = applyScoringGuardrails(critique, 'Orthopedics');

        assert.ok(result.auditData.clinical_score >= 85);
        // The guardrail function uses 'overall_status' from input unless blocked.
        // Assuming input status was implicitly undefined in mock, likely undefined in result if not blocked.
        // But let's check clinical_score mainly.
    });

    it('should not apply Ortho gates to Cardiology', () => {
        const critique = createMockCritique(88);
        critique.clinical_evidence_assessment.conservative_therapy.duration_weeks = 0; // Not needed for Cardio usually

        const result = applyScoringGuardrails(critique, 'Cardiology');
        // valid cardio usage shouldn't trigger ortho 6-week rule
        assert.ok(result.auditData.clinical_score > 70);
    });
});
