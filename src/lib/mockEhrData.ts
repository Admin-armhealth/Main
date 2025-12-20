export interface MockPatient {
    id: string;
    name: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other';
    insurance: {
        payer: string;
        id: string;
    };
    provider: {
        name: string;
        npi: string;
    };
    clinicalSummary: string;
    diagnosisCodes: string[]; // ICD-10
    procedureCodes: string[]; // CPT
}

export const MOCK_PATIENTS: MockPatient[] = [
    {
        id: 'P001',
        name: 'John Doe',
        dob: '1975-04-12',
        gender: 'Male',
        insurance: {
            payer: 'Aetna',
            id: 'W123456789',
        },
        provider: {
            name: 'Dr. Sarah Smith',
            npi: '1234567890',
        },
        clinicalSummary: `Patient presents with 6 months of chronic right knee pain.
Physical Exam: Antalgic gait, tenderness at medial joint line.
History: Failed 6 weeks of NSAIDs and home exercises.
Imaging: X-ray shows moderate OA. MRI ordered to rule out meniscal tear.
Function: Difficulty climbing stairs and squatting.`,
        diagnosisCodes: ['M17.11', 'M23.203'], // Unilateral primal OA right knee, Derangement of unspecified medial meniscus
        procedureCodes: ['73721'], // MRI Joint of Lower Extremity
    },
    {
        id: 'P002',
        name: 'Jane Roe',
        dob: '1962-08-23',
        gender: 'Female',
        insurance: {
            payer: 'Cigna',
            id: 'U987654321',
        },
        provider: {
            name: 'Dr. Michael Jones',
            npi: '0987654321',
        },
        clinicalSummary: `Patient evaluated for worsening hip pain affecting ADLs.
Exam: Restricted range of motion, painful internal rotation.
Imaging: X-rays demonstrate severe joint space narrowing and osteophytes (Kellgren-Lawrence Grade 4).
Previous Tx: Corticosteroid injections x2 provided only temporary relief.
Plan: Proceed with Total Hip Arthroplasty.`,
        diagnosisCodes: ['M16.11'], // Unilateral primary osteoarthritis, right hip
        procedureCodes: ['27130'], // Arthroplasty, acetabular and proximal femoral prosthetic replacement
    },
    {
        id: 'P003',
        name: 'Robert Smith',
        dob: '1958-11-30',
        gender: 'Male',
        insurance: {
            payer: 'UnitedHealthcare',
            id: 'HC55555555',
        },
        provider: {
            name: 'Dr. Emily Chen',
            npi: '1122334455',
        },
        clinicalSummary: `Patient seen for chest pain on exertion.
History: Hypertension, Hyperlipidemia.
Symptoms: Reproducible substernal chest pressure with moderate activity, relieved by rest.
EKG: NSR with nonspecific ST changes.
Plan: Stress Echocardiogram to evaluate for ischemia.`,
        diagnosisCodes: ['I20.9', 'I10'], // Angina pectoris, unspecified, Essential hypertension
        procedureCodes: ['93351'], // Stress Echocardiogram
    }
];
