'use client';

import React, { useState, useEffect } from 'react';
import { UploadForm } from '@/components/UploadForm';
import { OutputEditor } from '@/components/OutputEditor';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ApprovalDashboard } from '@/components/ApprovalDashboard';

export default function PreAuthPage() {
    const [step, setStep] = useState<1 | 2>(1);
    const [generatedContent, setGeneratedContent] = useState('');
    const [auditData, setAuditData] = useState<any>({ approval_likelihood: null, checklist: [] });
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastInput, setLastInput] = useState<{ text: string; codes: { cpt: string[]; icd: string[]; payer?: string; specialty?: string; tone?: string; patientRaw?: any; providerRaw?: any; } } | null>(null);
    const [requestId, setRequestId] = useState<string | null>(null);

    const handleGenerate = async (extractedText: string, codes: { cpt: string[]; icd: string[]; payer?: string; specialty?: string; tone?: string; patientRaw?: any; providerRaw?: any; }) => {
        setIsGenerating(true);
        setLastInput({ text: extractedText, codes });
        try {
            const res = await fetch('/api/preauth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinicType: 'General Practice',
                    specialty: codes.specialty || 'General',
                    extractedText,
                    cptCodes: codes.cpt,
                    icdCodes: codes.icd,
                    payer: codes.payer,
                    patientRaw: codes.patientRaw,
                    providerRaw: codes.providerRaw,
                    templates: {
                        tone: codes.tone || 'standard'
                    }
                }),
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();
            setGeneratedContent(data.result);
            setRequestId(data.request_id || null);
            setAuditData({
                approval_likelihood: data.approval_likelihood,
                confidence_level: data.confidence_level,
                checklist: data.checklist || [],
                missing_info: data.missing_info || [],
                denial_risk_factors: data.denial_risk_factors || []
            });
            setStep(2);
        } catch (error) {
            alert('Failed to generate pre-auth request. Please try again.');
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerate = () => {
        if (lastInput) {
            handleGenerate(lastInput.text, lastInput.codes);
        }
    };

    // Resume/History Loading Logic
    useEffect(() => {
        // Simple URL param check without heavy router dependency if possible, or use window
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            loadSavedRequest(id);
        }
    }, []);

    const loadSavedRequest = async (id: string) => {
        setIsGenerating(true);
        try {
            const { supabase } = await import('@/lib/supabaseClient');
            const { data, error } = await supabase
                .from('requests')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setGeneratedContent(data.content);
                setRequestId(data.id);
                if (data.metadata) {
                    setAuditData({
                        approval_likelihood: data.metadata.approval_likelihood || null,
                        checklist: data.metadata.checklist || [],
                        missing_info: [], // Legacy compat
                        denial_risk_factors: []
                    });

                    // Restore inputs if they were saved (Optional, for re-generation)
                    setLastInput({
                        text: '', // Text might not be saved in full if large, or assume user won't regenerate from scratch immediately
                        codes: {
                            cpt: data.metadata.cptCodes || [],
                            icd: data.metadata.icdCodes || [],
                            payer: data.payer,
                            patientRaw: { name: data.patient_name, id: data.patient_id, dob: '' }
                        }
                    });
                }
                setStep(2);
            }
        } catch (err) {
            console.error('Failed to load request:', err);
            // alert('Could not load saved request.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
                <a href="/history" className="hover:text-blue-600">History</a>
                <span>/</span>
                <span className="font-semibold text-blue-600">Pre-Authorization</span>
            </div>

            {step === 1 && (
                <UploadForm
                    title="Create Pre-Authorization Request"
                    description="Upload clinical notes/patient history to generate a formal request."
                    onConfirm={handleGenerate}
                    initialValues={lastInput ? {
                        text: lastInput.text,
                        ...lastInput.codes
                    } : null}
                />
            )}

            {step === 2 && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                    {/* LEFT COLUMN: Intelligence & Analysis (Sticky) */}
                    <div className="xl:col-span-4 xl:sticky xl:top-8 order-2 xl:order-1">
                        <ApprovalDashboard
                            data={auditData}
                            isVisible={step === 2}
                        />
                        <div className="mt-4 flex justify-between items-center px-2">
                            <button
                                onClick={() => {
                                    setStep(1);
                                    window.history.pushState({}, '', '/preauth'); // Clear ID
                                }}
                                className="text-xs font-semibold text-slate-400 hover:text-slate-600 uppercase tracking-wide transition-colors"
                            >
                                ← Edit Inputs / Clone
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Document Editor */}
                    <div className="xl:col-span-8 order-1 xl:order-2 w-full">
                        {/* Header for Editor */}
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Generated Letter Draft</h2>
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">Auto-Saved</span>
                        </div>

                        <OutputEditor
                            requestId={requestId || undefined}
                            initialContent={generatedContent}
                            onRegenerate={handleRegenerate}
                            isGenerating={isGenerating}
                            extractedData={{
                                patientRaw: lastInput?.codes.patientRaw,
                                cptCodes: lastInput?.codes.cpt,
                                icdCodes: lastInput?.codes.icd,
                                payer: lastInput?.codes.payer
                            }}
                            qualityData={{
                                score: auditData.approval_likelihood,
                                reasoning: auditData.missing_info?.length
                                    ? auditData.missing_info.join('. ')
                                    : (auditData.denial_risk_factors?.[0]?.rationale || null)
                            }}
                            onSave={(verified) => {
                                if (verified) alert('Document verified! (This would trigger e-signature in Phase 2)');
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            <LoadingOverlay isGenerating={isGenerating} type="preauth" />
        </div>
    );
}
