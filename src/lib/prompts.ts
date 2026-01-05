import { redactPHI } from './privacy';

export function getPreAuthPrompt(input: {
    clinicType?: string;
    specialty?: string;
    extractedText: string;
    cptCodes?: string[];
    icdCodes?: string[];
    payer?: string;
    patientRaw?: { name: string; id: string; dob: string };
    providerRaw?: { name: string; npi: string; tin: string; clinicName: string };
    templates?: { header?: string; signature?: string; tone?: string };
    policyContext?: string;
}): { systemPrompt: string; userPrompt: string } {
    const toneMap: Record<string, string> = {
        'urgent': 'URGENT, ASSERTIVE, and DIRECT',
        'academic': 'ACADEMIC, DETAILED, and CLINICALLY PRECISE',
        'friendly': 'PROFESSIONAL but PATIENT-ADVOCACY focused',
        'standard': 'PROFESSIONAL and OBJECTIVE'
    };

    const requestedTone = input.templates?.tone ? toneMap[input.templates.tone] || toneMap['standard'] : toneMap['standard'];

    const specialtyPrompts: Record<string, string> = {
        'Cardiology': `
CRITICAL CARDIOLOGY CRITERIA:
- Explicitly state LVEF% (Left Ventricular Ejection Fraction) if available.
- Mention METs (Metabolic Equivalents) achieved during stress testing.
- For Cath contexts: List specific coronary anatomy blockages (e.g., "70% LAD stenosis").`,
        'Orthopedics': `
CRITICAL ORTHOPEDIC CRITERIA (DENIAL PREVENTION):
- FAILURE OF CONSERVATIVE THERAPY: Check if the notes confirm ≥6 weeks. IF FOUND: State the duration explicitly. IF NOT FOUND: Output "[MISSING: Duration of Therapy > 6 weeks]".
- TIMELINE SPECIFICITY: Extract exact dates or durations for meds/PT. DO NOT INVENT TIMELINES.
- "RED FLAG" STATEMENT: IF specific mechanical symptoms (locking, giving way) are found, categorize them as "Mechanical Dysfunction". DO NOT use this term if symptoms are general pain only.
- FUNCTIONAL LIMITATIONS: Quote specific ADL deficits from the notes.
- IMAGING: Correlate MRI/X-Ray findings with symptoms.`,
        'Gastroenterology': `
CRITICAL GI CRITERIA:
- "ALARM SYMPTOMS": explicitly check for weight loss, anemia, occult blood, or dysphagia.
- FAMILY HISTORY: Note any first-degree relatives with Colon CA.
- Previous Endoscopies: Summarize findings from last procedure if relevant.`,
        'Dentistry': `
CRITICAL DENTAL CRITERIA:
- TOOTH NUMBERS: Specific tooth numbers (1-32) must be referenced explicitly.
- PERIODONTAL STATUS: If applicable (Scaling/Root Planing), cite probing depths >4mm.
- RADIOGRAPHS: Mention "Current X-Rays/Bitewings attached" or findings.
- NECESSITY: Link fracture/decay directly to the specific tooth code.`
    };
    const specialtyInstruction = input.specialty && specialtyPrompts[input.specialty]
        ? `\n\nSPECIALTY INSTRUCTIONS for ${input.specialty.toUpperCase()}:${specialtyPrompts[input.specialty]}`
        : '';

    const payerStyleGuide: Record<string, string> = {
        'Aetna': `
AETNA STYLE GUIDE:
- FOCUS: Conservative Management Timeline. 
- You MUST explicitly state the START and END dates of failed therapies (e.g., "PT from Jan 1 to Mar 1, 2024").
- Aetna is strict about duration. If duration is borderline, emphasize the "failure" of the therapy.`,
        'Cigna': `
CIGNA STYLE GUIDE:
- FOCUS: Objective Diagnostic Findings.
- Reduce subjective patient complaints.
- Quote the MRI/X-Ray report findings directly (e.g., "MRI confirms Grade III tear").
- Use "Medical Necessity" language heavily.`,
        'UnitedHealthcare': `
UHC STYLE GUIDE:
- FOCUS: Functional Impairment.
- Translate symptoms into "Inability to perform ADLs" (Activities of Daily Living).
- Use phrases like "Unable to work", "Unable to ambulate without pain", "Sleep disturbed".
- Connect the diagnosis to a specific loss of function.`,
        'BCBS': `
BCBS STYLE GUIDE:
- FOCUS: Policy Alignment.
- Reference the "Medical Policy" criteria point-by-point.
- If policy context is available, map findings directly to it.`
    };

    const payerInstruction = input.payer && payerStyleGuide[input.payer]
        ? `\n\n${payerStyleGuide[input.payer]}`
        : '';

    // Build patient/provider info for AI to use
    const patientInfo = input.patientRaw ? `
PATIENT DATA (Use these exact values in the letter):
- Patient Name: ${input.patientRaw.name || '[Patient Name]'}
- Date of Birth: ${input.patientRaw.dob || '[DOB]'}
- Member ID: ${input.patientRaw.id || '[Member ID]'}` : '';

    const providerInfo = input.providerRaw ? `
PROVIDER DATA (Use these exact values in the letter):
- Provider Name: ${input.providerRaw.name || '[Provider Name]'}
- Clinic/Facility: ${input.providerRaw.clinicName || '[Clinic Name]'}
- NPI: ${input.providerRaw.npi || '[NPI]'}
- Tax ID: ${input.providerRaw.tin || '[Tax ID]'}` : '';

    const systemPrompt = `You are an expert medical billing and insurance pre-authorization specialist. 
Your goal is to draft a professional, insurer-ready pre-authorization request letter.
Adhere to the following rules:
1. Tone: ${requestedTone}.
2. Be concise but thorough in justifying medical necessity.
3. CLEARLY list CPT and ICD codes.
4. CRITICAL: Use the ACTUAL patient and provider data provided below - DO NOT use placeholders like [Patient Name] or [DOB] when the real data is available.
5. Only use placeholders if specific data was NOT provided.
6. Today's date is: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}.
7. PREVENT DENIALS: Use explicit failure language. E.g., "Symptoms persist despite ≥6 weeks of conservative therapy".
8. READABILITY RULES: 
   - Paragraphs must be short (max 4 sentences). 
   - Use bullet points for all clinical evidence.
   - Insert a "KEY EVIDENCE SUMMARY" box at the very top of the letter.
9. Structure the output with clear headings: "KEY EVIDENCE SUMMARY", "Patient Summary", "Diagnosis & Rationale", "Medical Necessity", "CPT/ICD Codes".
${patientInfo}
${providerInfo}
${specialtyInstruction}${payerInstruction}`;

    const customHeader = input.templates?.header ? `${input.templates.header}\n\n` : '';
    const customSignature = input.templates?.signature ? `\n\n${input.templates.signature}` : '';

    const insuranceTemplates: Record<string, string> = {
        'Aetna': `
${customHeader}# AETNA PRECERTIFICATION REQUEST
**Plan Type:** (HMO/PPO/POS) [Extract or Default 'PPO']
**Patient Name:** [PATIENT] | **Member ID:** [ID] | **DOB:** [DOB]
**Provider:** ${input.providerRaw?.name || '[Name]'} (${input.providerRaw?.clinicName || '[Clinic]'})
**TIN:** ${input.providerRaw?.tin || '[TIN]'} | **NPI:** ${input.providerRaw?.npi || '[NPI]'}
**Diagnosis (ICD-10):** ${input.icdCodes?.join(', ') || '[List Codes]'}
**Procedure (CPT):** ${input.cptCodes?.join(', ') || '[List Codes]'}

**CLINICAL INFORMATION**
*   **Checklist for Medical Necessity:**
    *   [ ] Conservative Therapy Failed? (Duration: [Weeks] - Must be ≥6)
    *   [ ] Imaging Confirms Diagnosis? (Date: [Date])
*   **Clinical Summary:**
    [Detailed narrative matching Aetna CPB guidelines. Explicitly mention "mechanical dysfunction" if applicable.]
${customSignature}`,
        'Cigna': `
${customHeader}# CIGNA PRIOR AUTHORIZATION FORM
**Routing:** Medical Review Team
**Patient:** [PATIENT] (ID: [ID])
**Facility/Clinic:** ${input.providerRaw?.clinicName || '[Clinic Name]'}
**Request:** ${input.cptCodes?.join(', ') || 'Service Request'}

**CLINICAL JUSTIFICATION**
*   **Previous Therapies (Required):**
    *   Medication A: [Name] (Dates: [Range]) - [Outcome]
    *   Medication B: [Name] (Dates: [Range]) - [Outcome]
*   **Current Functional Status:** [Description]
*   **Rationale for Intervention:** [Specific Cigna Policy Criteria Met]
${customSignature}`,
        'UnitedHealthcare': `
${customHeader}# UNITEDHEALTHCARE ADVANCE NOTIFICATION
**Member:** [PATIENT] | **Group #:** [Group]
**Facility:** ${input.providerRaw?.clinicName || input.providerRaw?.name || '[Name]'} | **Tax ID:** ${input.providerRaw?.tin || '[ID]'}

**SERVICE DETAIL**
*   **Service Type:** [Elective / Urgent]
*   **Place of Service:** [Generic]
*   **Code(s):** ${input.cptCodes?.join(', ') || '[Codes]'}

**CLINICAL NOTES ATTACHED SUMMARY**
*   **History of Present Illness:** [Summary]
*   **Physical Exam Findings:** [Key positive findings]
*   **Plan of Care:** [Planned procedure and post-op care]
${customSignature}`,
        'BCBS': `
${customHeader}# BLUE CROSS BLUE SHIELD PRE-SERVICE REVIEW
**Local Plan:** [State Plan Name]
**Patient:** [PATIENT] | **Subscriber ID:** [ID]
**Provider/Facility:** ${input.providerRaw?.clinicName || input.providerRaw?.name || '[Name]'}

**MEDICAL NECESSITY CRITERIA**
*   **Diagnosis:** ${input.icdCodes?.join(', ') || '[ICD-10]'}
*   **Policy Ref:** [Applicable Medical Policy]
*   **Treatment History:**
    [Bullet points of failed conservative care 1, 2, 3. INLCUDE DURATION for each.]
*   **Proposed Treatment:**
    [Description of ${input.cptCodes?.join(', ') || 'service'}]
${customSignature}`
    };

    const selectedTemplate = input.payer && insuranceTemplates[input.payer]
        ? insuranceTemplates[input.payer]
        : `
${customHeader}# STANDARD PRIOR AUTHORIZATION REQUEST FORM
**Section I - Patient Info:** [PATIENT] | [DOB] | [ID]
**Section II - Provider Info:** ${input.providerRaw?.name || '[Name]'} | ${input.providerRaw?.clinicName || '[Clinic]'} | ${input.providerRaw?.npi || '[NPI]'}
**Section III - Clinical:**
*   **Diagnosis:** ${input.icdCodes?.join(', ') || '[Codes]'}
*   **Rationale:** [Clinical Argument - Include "mechanical dysfunction" statement if applicable]
${customSignature}`;

    const userPrompt = `
Context:
Clinic Type: ${input.clinicType || 'General Practice'}
Specialty: ${input.specialty || 'N/A'}
Target Payer: ${input.payer || 'Generic'}

Policy Guidelines / Cheat Sheet:
"""
${input.policyContext || 'No specific policy guidelines provided.'}
"""

Extracted Clinical Notes:
"""
${redactPHI(input.extractedText, input.patientRaw?.name)}
"""

Requested CPT Codes: ${input.cptCodes?.join(', ') || 'N/A'}
Requested ICD Codes: ${input.icdCodes?.join(', ') || 'N/A'}

Please generate a pre-authorization request using the format below.
IMPORTANT: STRICTLY FOLLOW THE LAYOUT FOR ${input.payer ? input.payer.toUpperCase() : 'STANDARD FORM'}.

${selectedTemplate}
`;

    return { systemPrompt, userPrompt };
}

export function getAppealPrompt(input: {
    denialReason: string;
    extractedText: string;
    cptCodes?: string[];
    icdCodes?: string[];
    patientRaw?: { name: string; id: string; dob: string };
    providerRaw?: { name: string; npi: string; tin: string; clinicName: string };
    templates?: { header?: string; signature?: string; tone?: string };
}): { systemPrompt: string; userPrompt: string } {
    const toneMap: Record<string, string> = {
        'urgent': 'URGENT, ASSERTIVE, and DIRECT',
        'academic': 'ACADEMIC, DETAILED, and CLINICALLY PRECISE',
        'friendly': 'PROFESSIONAL but PATIENT-ADVOCACY focused',
        'standard': 'PROFESSIONAL, PERSUASIVE, and OBJECTIVE'
    };

    const requestedTone = input.templates?.tone ? toneMap[input.templates.tone] || toneMap['standard'] : toneMap['standard'];

    // Build patient/provider info for AI to use
    const patientInfo = input.patientRaw ? `
PATIENT DATA (Use these exact values in the letter):
- Patient Name: ${input.patientRaw.name || '[Patient Name]'}
- Date of Birth: ${input.patientRaw.dob || '[DOB]'}
- Member ID: ${input.patientRaw.id || '[Member ID]'}` : '';

    const providerInfo = input.providerRaw ? `
PROVIDER DATA (Use these exact values in the letter):
- Provider Name: ${input.providerRaw.name || '[Provider Name]'}
- Clinic/Facility: ${input.providerRaw.clinicName || '[Clinic Name]'}
- NPI: ${input.providerRaw.npi || '[NPI]'}
- Tax ID: ${input.providerRaw.tin || '[Tax ID]'}` : '';

    const systemPrompt = `You are an expert medical billing and insurance appeal specialist.
Your goal is to draft a strong appeal letter for a denied claim.
Adhere to the following rules:
1. Tone: ${requestedTone}.
2. Directly address the denial reason with clinical evidence from the provided notes.
3. Cite generic clinical guidelines if applicable (e.g., "per standard referencing guidelines") without fabricating specific non-existent papers.
4. CRITICAL: Use the ACTUAL patient and provider data provided below - DO NOT use placeholders like [Patient Name] or [DOB] when the real data is available.
5. Only use placeholders if specific data was NOT provided.
6. Today's date is: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}.
7. Structure the output with clear headings: "Case Summary", "Clinical Justification", "Response to Denial", "Closing".
8. NEGATIVE CONSTRAINT: Do NOT generate a "Pre-Authorization Request". This is an APPEAL for an already denied claim. The context may contain the original denial letter; do NOT regurgitate it as your own request.
${patientInfo}
${providerInfo}`;

    const customHeader = input.templates?.header ? `${input.templates.header}\n\n` : '';
    const customSignature = input.templates?.signature ? `\n\n${input.templates.signature}` : '';

    // Use actual patient data in template
    const patientName = input.patientRaw?.name || '[Patient Name]';
    const patientDob = input.patientRaw?.dob || '[DOB]';
    const patientId = input.patientRaw?.id || '[Member ID]';

    const userPrompt = `
${customHeader}Date: ${new Date().toLocaleDateString()}
Re: Appeal for Denied Claim

**Patient Name:** ${patientName}
**Member ID:** ${patientId}
**DOB:** ${patientDob}

**Provider:** ${input.providerRaw?.name || '[Name]'}
**Facility:** ${input.providerRaw?.clinicName || '[Clinic]'}
**NPI:** ${input.providerRaw?.npi || '[NPI]'} | **TIN:** ${input.providerRaw?.tin || '[TIN]'}

**Service Date / Reference:** ${new Date().toLocaleDateString()}
**CPT Codes:** ${input.cptCodes?.join(', ') || 'N/A'}
**ICD Codes:** ${input.icdCodes?.join(', ') || 'N/A'}

**Reason for Denial:**
"${input.denialReason}"

**Supporting Documentation (Denial Letter + Clinical Notes):**
"""
${redactPHI(input.extractedText, input.patientRaw?.name)}
"""

Please generate a formal appeal letter refuting the denial and justifying the medical necessity of the services based on the provided clinical notes. The letter should be addressed to the Appeals Department.
${customSignature}
`;

    return { systemPrompt, userPrompt };
}

export function getCritiquePrompt(input: {
    originalRequestParameters: any;
    generatedDraft: string;
    policyContext?: string;
    isAppeal?: boolean;
}): { systemPrompt: string; userPrompt: string } {
    const isAppeal = input.isAppeal || false;
    const specialty = input.originalRequestParameters?.specialty || 'General';
    const isDental = specialty === 'Dentistry';

    const systemPrompt = `You are a Medical Quality Assurance Auditor & Denial Prevention Specialist.
Your job is to review AI-generated insurance letters and the source clinical notes to predict approval likelihood based on MEDICAL NECESSITY.

### SAFETY PROTOCOL:
Before scoring, you must explicitly COMPARE the Body Site in the Diagnosis/Imaging (e.g., "Shoulder", "L4-L5") against the Procedure Request (e.g., "Knee", "Cervical").
- If they do NOT match -> You MUST set "primary_risk_factor.type" to "clinical_mismatch".
- If they DO match -> Proceed with normal scoring.

You must return your assessment in strict JSON format matching this specific schema:
{
  "clinical_evidence_assessment": {
    "conservative_therapy": { 
        "present": false, 
        "duration_weeks": 0, // MUST BE 0 if no specific number (e.g. "6 weeks") or date range is found. DO NOT GUESS for "some time" or "a while".
        "evidence_quote": "", // **CRITICAL**: If duration_weeks > 0, you MUST provide the EXACT substring from the input text that proves this duration (e.g., "6 weeks of PT from 1/1 to 2/15"). If no such text exists, duration_weeks MUST be 0.
        "strength": "strong" | "weak" | "missing" // "weak" if duration is 0 or missing.
    },
    "objective_findings": { 
        "present": false, 
        "description": "string" 
    }
  },
  "appeal_summary": {
      "denial_reason_addressed": true, // Did the draft directly refute the specific denial reason?
      "evidence_strength": "strong" | "weak" | "irrelevant", // "irrelevant" if evidence does not match denial topic (e.g. PT notes for an "Experimental" denial).
      "appeal_recommended": true, 
      "reason": "string" 
  },
  "clinical_score": 0, // 0-100 (Medical Necessity Strength). RULES: Max 39 if 'Conservative Therapy' is VAGUE or completely missing durations. Max 50 if exam findings missing.
  "admin_score": 0, // 0-100 (Administrative Completeness).
  "overall_status": "ready" | "blocked" | "high_risk", // ready=high clinical+admin, blocked=critical missing/mismatch, high_risk=low clinical score
  
  "score_band": "likely_denial" | "high_risk" | "borderline" | "strong_case", // 0-39, 40-69, 70-84, 85+
  "score_band_label": "string", 
  "delta_to_next_band": 0, 
  "next_band": "string", 
  
  "simulated_verdict": "Approve" | "Conditional" | "Deny",
  
  "primary_risk_factor": {
     "type": "clinical" | "administrative" | "clinical_mismatch",
     "message": "string" 
  },

  "checklist": [
    { 
      "label": "string", 
      "status": "PASS" | "FAIL" | "WARN",
      "strength_label": "strong" | "weak" | "missing", // "strong"=specific dates/values, "weak"=vague, "missing"=not found
      "finding": "string", // Short summary
      "evidence_excerpt": "string",
      "score_impact": 0 // Potential +X gain
    }
  ],
  
  "missing_info": ["string"], 
  "denial_risk_factors": [ 
    { 
        "risk": "string", 
        "severity": "critical"|"moderate"|"low", 
        "rationale": "string" 
    } 
  ], 
  "improved_draft": "string",
  
  "strategy_used": "string", 
  "appeal_recommendation": "File Appeal" | "Do Not Appeal",
  "key_evidence_used": ["string"]
}

${isAppeal ? `
SCORING RULES (Appeal Mode):
- 0-25 (Futile): Denial reason NOT addressed, or evidence is irrelevant. "Do Not Appeal".
- 26-49 (Weak): Addressed denial but evidence is weak/vague. e.g. "Tried PT" vs Denial "Need 6 weeks PT logs".
- 50-79 (Contestable): Good argument, some missing administrative proofs.
- 80+ (Strong): Direct, irrefutable evidence overturning the denial claim.

CRITICAL APPEAL GATES:
1. If "denial_reason_addressed" is false -> Score MUST be < 25.
2. If evidence explicitly contradicts the denial (e.g. Denial says "No PT", Note says "PT Done") -> Score > 75.
3. If new evidence is completely missing -> Mark "appeal_recommended": false.
` : `
SCORING RULES (Clinical - ${specialty}):

${isDental ? `
- 0-39 (Likely Denial): Missing Tooth Numbers or no X-ray findings cited.
- 40-69 (High Risk): Vague "pain" without objective findings (fracture, decay depth).
- 70-84 (Borderline): Good history but missing specific periodontal probing depths if applicable.
- 85+ (Strong Case): Tooth # specified, X-ray findings corroborated, clear medical necessity (decay/fracture).

CRITICAL CHECKS:
1. Are TOOTH NUMBERS (1-32) explicitly stated? If NO, clinical_score MUST be < 50.
2. Is there objective evidence (X-ray, Probing Depth, Fracture)? If NO, strength_label="weak".
` : specialty === 'Orthopedics' ? `
- 0-39 (Likely Denial): No therapy dates defined, vague pain only. "Tried PT" without duration = MAX 39.
- 40-69 (High Risk): "Tried PT" but no duration. Missing exam findings. Body site mismatch.
- 70-84 (Borderline): Good history but maybe missing specific imaging dates or functional formatting.
- 85+ (Strong Case): "6 weeks" explicit, specific MRI findings, functional deficits mapped to ADLs.

CRITICAL CHECKS:
1. Is "≥6 weeks of conservative therapy" explicitly stated? If NO, strength_label="weak" and clinical_score MUST be < 50.
2. Is "mechanical dysfunction" mentioned? If NO, clinical_score MUST be < 70.
` : `
- 0-39 (Likely Denial): Vague symptoms (e.g., "Chest pain", "Stomach ache") without biomarkers (Troponin, LVEF, Hemoglobin).
- 40-69 (High Risk): Diagnosis asserted but key objective values (LVEF, Weight Loss kgs, Labs) missing.
- 70-84 (Borderline): Good history and values, but might lack specific dates or prior failed trial details if applicable.
- 85+ (Strong Case): Specific biomarkers present (e.g. "LVEF 45%", "Hgb 8.0"). Protocol criteria (Risk Score, Family Hx) fully documented.
`}
3. Check for BODY SITE MISMATCH. Compare the CPT/Procedure Code description against the body part in the notes.
4. Check for MISSING ADMIN INFO (NPI, Tax ID). If missing, risk severity="critical".
5. If durations are VAGUE (e.g. "a while", "some time", "years ago"), score MUST be < 40.
6. ANTI-HALLUCINATION: Do NOT infer variables.
`
        }
`;

    // 🛡️ HIPAA SAFETY: Sanitize the context before sending to AI
    const safeContext = {
        ...input.originalRequestParameters,
        extractedText: input.originalRequestParameters?.extractedText
            ? redactPHI(input.originalRequestParameters.extractedText)
            : undefined,
        patientRaw: undefined, // REMOVE explicitly
        providerRaw: undefined // REMOVE explicitly (or keep minimal if needed, but safer to remove for critique)
    };

    const userPrompt = `
Policy / Payer Guidelines:
"""
${input.policyContext || "Standard Clinical Guidelines apply."}
"""

SOURCE CONTEXT (Clinical Notes & Metadata):
${JSON.stringify(safeContext, null, 2)}

DRAFT MESSAGE (To be audited):
"""
${input.generatedDraft}
"""

Please audit this draft against the source context and policy. 
CRITICAL OUTPUT INSTRUCTION:
- If ANY critical criteria (defined in SCORING RULES) is missing (e.g. "6 weeks duration", "Mechanical Dysfunction"), you MUST add it to the "missing_info" array.
- "missing_info" strings should be actionable, e.g., "Add start/end dates for PT".
Return ONLY the JSON object.
`;

    return { systemPrompt, userPrompt };
}
