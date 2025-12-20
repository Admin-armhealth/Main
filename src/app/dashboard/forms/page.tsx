
'use client';

import React, { useState } from 'react';
import { FileText, Upload, Filter, Search, CheckCircle2 } from 'lucide-react';
import { UploadForm as ClinicalUpload } from '@/components/UploadForm';
import { FormReviewModal } from '@/components/FormReviewModal';
import { generateText } from '@/lib/aiClient';

export default function FormsLibraryPage() {
    const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library');
    const [selectedForm, setSelectedForm] = useState<string | null>(null);
    const [customFile, setCustomFile] = useState<File | null>(null);

    // UI State
    const [stage, setStage] = useState<'select' | 'upload_notes' | 'review'>('select');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState<{ [key: string]: string }>({});

    // Data
    const standardForms = [
        { id: 'texas_standard_prior_auth.pdf', name: 'Texas Standard Prior Auth', provider: 'TDI' },
        { id: 'aetna_precertification.pdf', name: 'Aetna Precertification Request', provider: 'Aetna' },
        { id: 'cms_1500_claim.pdf', name: 'CMS-1500 Claim Form', provider: 'Medicare/Medicaid' },
    ];

    const handleSelectForm = (id: string) => {
        setSelectedForm(id);
        setCustomFile(null);
        setStage('upload_notes');
    };

    const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCustomFile(file);
            setSelectedForm(null);

            // Analyze fields immediately
            setIsAnalyzing(true);
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/forms/analyze', { method: 'POST', body: formData });
                const data = await res.json();
                console.log('Analyzed fields:', data.fields);
                // We don't do anything with fields yet, just confirming it's a form.
            } catch (err) {
                console.error('Analysis failed', err);
            } finally {
                setIsAnalyzing(false);
                setStage('upload_notes');
            }
        }
    };

    const handleAnalyzeNotes = async (files: File[], text: string) => {
        setIsAnalyzing(true);
        // 1. Get Fields (if custom, re-analyze; if library, we know them - but for prototype we analyze both dynmically or hardcode)
        // For efficiency, let's ask the backend for fields of the selected template too?
        // Or just let the AI halluicinate standardized fields and we map them.

        // BETTER: Analyze the target PDF (Library or Custom) to get field names.
        let targetFields: string[] = [];

        if (customFile) {
            const formData = new FormData();
            formData.append('file', customFile);
            const res = await fetch('/api/forms/analyze', { method: 'POST', body: formData });
            const data = await res.json();
            targetFields = data.fields;
        } else if (selectedForm) {
            // Check library fields? Hardcode for Texas form for speed, or implement analyze endpoint getter.
            // Let's implement a GET analyze for template? Or just use known set for Texas.
            targetFields = ['patient_name', 'dob', 'member_id', 'group_id', 'provider_name', 'provider_npi', 'diagnosis_code', 'procedure_code', 'clinical_reasoning'];
        }

        // 2. Call AI with target fields
        // In real app, we'd bundle this into an API route, but calling client-side for prototype speed.
        try {
            const prompt = `
            Extract the following fields from the clinical notes.
            Target Fields: ${JSON.stringify(targetFields)}
            
            Clinical Notes:
            ${text}
            
            Return ONLY a JSON object mapping field names to values.
            Use "N/A" if not found.
            `;

            // We need to use valid JSON mode.
            // aiClient on client-side? No, it's server-side only usually due to secrets.
            // We need an API route for this. `api/generate`?
            // Actually, we can use the existing /api/generate or mock one.
            // For now, let's Mock the extraction locally if AI client is server-side.
            // Wait, aiClient IS server side.
            // I need a Server Action or API Route.
            // I'll create a simple ad-hoc API call using `fetch('/api/analyze_notes', ...)` logic.

            // REFACTOR: Let's use a server action or just mock it here for the UI prototype,
            // OR use the `evaluate_features` script logic.
            // Let's create `/api/forms/ai_extract`.

            const aiRes = await fetch('/api/forms/ai_extract', {
                method: 'POST',
                body: JSON.stringify({
                    text,
                    fields: targetFields
                })
            });
            const aiData = await aiRes.json();
            setExtractedData(aiData);
            setStage('review');

        } catch (e) {
            console.error(e);
            alert('Failed to analyze notes');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerate = async (finalData: { [key: string]: string }) => {
        setIsAnalyzing(true);
        try {
            const body: any = {
                fieldValues: finalData
            };

            if (selectedForm) {
                body.templateName = selectedForm;
            } else if (customFile) {
                // Convert to base64
                const buffer = await customFile.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                body.customFileBase64 = base64;
            }

            const res = await fetch('/api/forms/fill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `filled_${selectedForm || customFile?.name || 'form'}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert('Generation failed');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Smart Form Library</h1>
            <p className="text-slate-500 mb-8">Select a standard form or upload your own, and let AI fill it instantly.</p>

            {/* Stage 1: Select Form */}
            {stage === 'select' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('library')}
                            className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'library' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Standard Library
                        </button>
                        <button
                            onClick={() => setActiveTab('custom')}
                            className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'custom' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Upload Custom Form
                        </button>
                    </div>

                    <div className="p-8 min-h-[400px]">
                        {activeTab === 'library' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {standardForms.map(form => (
                                    <div key={form.id} className="group relative bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all hover:border-blue-300">
                                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 text-red-600">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-slate-800 mb-1 line-clamp-2">{form.name}</h3>
                                        <p className="text-sm text-slate-500 mb-4">{form.provider}</p>
                                        <button
                                            onClick={() => handleSelectForm(form.id)}
                                            className="w-full py-2 bg-slate-50 text-slate-600 font-medium rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"
                                        >
                                            Select Form
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors bg-slate-50">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleCustomUpload}
                                    className="hidden"
                                    id="custom-upload"
                                />
                                <label htmlFor="custom-upload" className="cursor-pointer flex flex-col items-center">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Upload your PDF Form</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto">
                                        Drag and drop or click to upload any standard PDF form. We'll analyze the fields automatically.
                                    </p>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stage 2: Upload Notes (Reuse Component) */}
            {stage === 'upload_notes' && (
                <div className="space-y-6">
                    <button onClick={() => setStage('select')} className="text-slate-500 hover:text-slate-800 font-medium flex items-center">
                        ← Back to Selection
                    </button>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-xl font-bold mb-4">Upload Clinical Context</h2>
                        {/* Simplified usage of UploadForm logic - we just need the text essentially.
                             For the prototype, we can use a textarea or reuse the complex component.
                             To avoid complexity, let's implement a simple text area for the prototype "Notes".
                         */}
                        <textarea
                            className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Paste extraction of clinical notes here for the prototype..."
                            id="notes-input"
                        ></textarea>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => {
                                    const val = (document.getElementById('notes-input') as HTMLTextAreaElement).value;
                                    handleAnalyzeNotes([], val);
                                }}
                                disabled={isAnalyzing}
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Auto-Fill Form'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stage 3: Review */}
            {stage === 'review' && (
                <FormReviewModal
                    fields={extractedData}
                    onClose={() => setStage('upload_notes')}
                    onGenerate={handleGenerate}
                    isGenerating={isAnalyzing}
                    formName={selectedForm || customFile?.name || 'Custom Form'}
                />
            )}
        </div>
    );
}
