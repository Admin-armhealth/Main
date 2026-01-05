'use client';

import { OutputEditor } from '@/components/OutputEditor';

const DENIAL_CONTENT = `
# NOTICE OF ADVERSE BENEFIT DETERMINATION

**Date:** January 2, 2025
**Dr.** John Doe, MD
**Patient:** Jane Smith (Member ID: 999-88-7777)
**Claim:** CLM-2024-001
**Service:** Lumbar Fusion (L4-L5)

Dear Provider,

We have reviewed your request for the service listed above. **Coverage is DENIED.**

## Reason for Denial
**Lack of Medical Necessity**
Based on the clinical documentation provided, the request does not meet the criteria for medical necessity under **Policy 12.34 (Spinal Surgery)**. 

Specifically, the records do not demonstrate:
1.  Failure of at least 6 months of conservative therapy.
2.  Documented instability on flexion-extension x-rays.

Therefore, the request is denied.

## Your Appeal Rights
You have the right to appeal this decision within 180 days. Please submit additional clinical evidence, including physical therapy notes and imaging reports, to support your request.

**Sincerely,**

Medical Director
Global Health Insurance
`;

export default function TestDenialPdfPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Appeal Letter PDF Test</h1>
            <p className="mb-4 text-gray-600">
                Click "Save as PDF" below to verify the layout for a standard denial appeal.
            </p>
            <div className="border border-gray-200 rounded-lg shadow-sm">
                <OutputEditor
                    initialContent={DENIAL_CONTENT}
                    requestId="test-denial-id"
                    onSave={async () => { console.log('Mock save'); }}
                    isGenerating={false}
                    onRegenerate={() => console.log('Mock regenerate')}
                />
            </div>
        </div>
    );
}
