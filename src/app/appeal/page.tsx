'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { UploadForm } from '@/components/UploadForm';
import { OutputEditor } from '@/components/OutputEditor';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { AppealDashboard } from '@/components/AppealDashboard';

function AppealPageContent() {
    const searchParams = useSearchParams();
    const requestId = searchParams.get('id');

    const [step, setStep] = useState<1 | 2>(1);
    const [generatedContent, setGeneratedContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Audit Data for Dashboard
    const [auditData, setAuditData] = useState<any>({
        approval_likelihood: 0,
        checklist: [],
        missing_info: [],
        denial_risk_factors: []
    });

    // Resume functionality
    useEffect(() => {
        if (requestId) {
            loadRequest(requestId);
        }
    }, [requestId]);

    const loadRequest = async (id: string) => {
        setIsGenerating(true);
        const { data, error } = await supabase
            .from('requests')
            .select('*')
            .eq('id', id)
            .single();

        if (data && !error) {
            setGeneratedContent(data.content);
            if (data.metadata) {
                setAuditData({
                    approval_likelihood: data.metadata.approval_likelihood || 0,
                    checklist: data.metadata.checklist || [],
                    missing_info: [],
                    denial_risk_factors: []
                });
            }
            setStep(2);
        }
        setIsGenerating(false);
    };

    const handleGenerate = async (extractedText: string, codes: { cpt: string[]; icd: string[]; patientRaw?: any; providerRaw?: any; }) => {
        setIsGenerating(true);

        // Simple Heuristic for denial reason if not explicitly prompted (Future: Add specific input)
        const denialReason = "Medical Necessity Denial (Generic)";

        try {
            const res = await fetch('/api/appeal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    denialReason,
                    extractedText,
                    cptCodes: codes.cpt,
                    icdCodes: codes.icd,
                    patientRaw: codes.patientRaw,
                    providerRaw: codes.providerRaw,
                }),
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();
            setGeneratedContent(data.result);
            setAuditData({
                approval_likelihood: data.approval_likelihood,
                checklist: data.checklist || [],
                missing_info: data.missing_info || [],
                denial_risk_factors: data.denial_risk_factors || []
            });
            setStep(2);
        } catch (error) {
            alert('Failed to generate appeal letter. Please try again.');
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerate = () => {
        // regenerate logic (omitted for brevity, typically re-calls generate with last input)
    };

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <span>Appeals</span>
                    <span>/</span>
                    <span className="font-semibold text-amber-600">New Appeal</span>
                </div>
            </div>

            {step === 1 && (
                <div className="flex-1 overflow-auto p-8">
                    <UploadForm
                        title="Create Appeal Letter"
                        description="Upload the **Denial Letter** and meaningful clinical notes."
                        onConfirm={handleGenerate}
                    />
                </div>
            )}

            {step === 2 && (
                <div className="flex-1 overflow-hidden">
                    <div className="h-full grid xl:grid-cols-12">
                        {/* Dashboard - 33% */}
                        <div className="xl:col-span-4 h-full overflow-hidden border-r border-slate-200 bg-slate-50">
                            <AppealDashboard
                                auditData={auditData}
                                denialReason="Medical Necessity"
                            />
                        </div>

                        {/* Editor - 67% */}
                        <div className="xl:col-span-8 h-full overflow-hidden bg-white">
                            <OutputEditor
                                initialContent={generatedContent}
                                onRegenerate={handleRegenerate}
                                isGenerating={isGenerating}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            <LoadingOverlay isGenerating={isGenerating} type="appeal" />
        </div>
    );
}

export default function AppealPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AppealPageContent />
        </Suspense>
    );
}
