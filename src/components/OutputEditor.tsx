'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Download, RefreshCw, CheckCheck, FileText, Code, Edit3, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SubmissionPackButton } from './SubmissionPackButton';

interface OutputEditorProps {
    initialContent: string;
    onRegenerate: () => void;
    isGenerating: boolean;
    extractedData?: {
        patientRaw?: { name: string; id: string; dob: string };
        cptCodes?: string[];
        icdCodes?: string[];
        payer?: string;
    };
    qualityData?: { score: number | null; reasoning: string | null };
    onSave?: (verified: boolean) => void;
    requestId?: string; // For submission pack export
}

export function OutputEditor({ initialContent, onRegenerate, isGenerating, extractedData, qualityData, onSave, requestId }: OutputEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [copied, setCopied] = useState(false);
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');

    // Verification State
    const [verifiedCodes, setVerifiedCodes] = useState(false);
    const [verifiedClinical, setVerifiedClinical] = useState(false);
    const [verifiedPatient, setVerifiedPatient] = useState(false);

    // 🔒 REHYDRATION: Restore Real Names for Display Only (Never stored on server)
    const rehydratePHI = (text: string) => {
        if (!text || !extractedData?.patientRaw) return text;

        let hydrated = text;

        // 1. Patient Name
        if (extractedData.patientRaw.name) {
            hydrated = hydrated.replace(/\[PATIENT_NAME\]/g, extractedData.patientRaw.name);
            hydrated = hydrated.replace(/\[PATIENT\]/g, extractedData.patientRaw.name);
            // Catch fallback placeholders
            hydrated = hydrated.replace(/\[Name\]/g, extractedData.patientRaw.name);
        }

        // 2. Patient ID/MRN
        if (extractedData.patientRaw.id) {
            hydrated = hydrated.replace(/\[ID\]/g, extractedData.patientRaw.id);
            hydrated = hydrated.replace(/\[ID_SSN\]/g, extractedData.patientRaw.id);
            hydrated = hydrated.replace(/\[Member ID\]/g, extractedData.patientRaw.id);
        }

        // 3. DOB
        if (extractedData.patientRaw.dob) {
            hydrated = hydrated.replace(/\[DOB\]/g, extractedData.patientRaw.dob);
            hydrated = hydrated.replace(/\[Date of Birth\]/g, extractedData.patientRaw.dob);
        }

        // ⚠️ CRITICAL SAFETY WARNING:
        // This rehydrated content contains REAL PHI (Patient Name/ID).
        // NEVER persist this 'hydrated' variable to the database or external logs.
        // It is for DISPLAY purposes in this component only.
        return hydrated;
    };

    useEffect(() => {
        // Apply Rehydration immediately upon receiving content
        setContent(rehydratePHI(initialContent));
    }, [initialContent, extractedData]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadPDF = async () => {
        try {
            console.log('Starting PDF generation...');
            if (mode !== 'preview') {
                setMode('preview');
                // Allow render cycle to complete
                await new Promise(resolve => setTimeout(resolve, 300)); // Increased timeout
            }

            const element = document.getElementById('preview-content');
            if (!element) {
                console.error('PDF Error: Preview element not found');
                alert('Could not find document content. Please switch to Preview mode.');
                return;
            }

            const date = new Date();
            const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `Medical_PreAuth_${timestamp}.pdf`;

            const opt = {
                margin: [0.75, 0.5, 0.5, 0.5], // Top, Right, Bottom, Left (Increased Top to fix cutoff)
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: true,
                    scrollY: 0, // Force top of document
                    windowWidth: document.getElementById('preview-content')?.scrollWidth, // Capture full width
                    letterRendering: true,
                },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            } as any;

            // Robust Import
            console.log('Importing html2pdf...');
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default || html2pdfModule;

            if (!html2pdf) {
                throw new Error('Failed to load PDF library');
            }

            console.log('Generating PDF...');
            // CLONE and APPEND to body to ensure html2canvas can render computed styles
            // (Detached nodes cause hangs/crashes in some versions of html2canvas)
            const clonedElement = element.cloneNode(true) as HTMLElement;

            // Style it to be invisible but rendered
            Object.assign(clonedElement.style, {
                position: 'fixed',
                left: '-9999px',
                top: '0',
                width: `${element.offsetWidth}px`, // Preserve width
                zIndex: '-1000'
            });
            document.body.appendChild(clonedElement);

            try {
                console.log('Generating PDF from clone...');
                await html2pdf().set(opt).from(clonedElement).save();
                console.log('PDF Saved!');
            } finally {
                // CLEANUP: Always remove the clone, even if PDF generation fails
                if (document.body.contains(clonedElement)) {
                    document.body.removeChild(clonedElement);
                }
            }

        } catch (error) {
            console.error('PDF Generation Failed:', error);
            // Fallback to browser print which is robust and now styled
            window.print();
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'bg-slate-100 text-slate-500';
        if (score >= 9) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (score >= 7) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-rose-100 text-rose-700 border-rose-200';
    };

    return (
        <div className="rounded-2xl shadow-lg border border-slate-200 bg-white overflow-hidden transition-all hover:shadow-xl flex flex-col h-[40rem]">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-slate-50/80 backdrop-blur-sm p-4 border-b border-slate-200 sticky top-0 z-10">
                <div className="flex items-center space-x-1 bg-slate-200/50 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('preview')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${mode === 'preview'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                    >
                        <FileText className="w-3.5 h-3.5 mr-1.5" /> Document Preview
                    </button>
                    <button
                        onClick={() => setMode('edit')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${mode === 'edit'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                    >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Source
                    </button>
                </div>

                <div className="flex space-x-2">
                    {/* Quality Score Badge */}
                    {qualityData?.score !== undefined && qualityData.score !== null && (
                        <div className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border ${getScoreColor(qualityData.score)}`} title={qualityData.reasoning || ''}>
                            <span className="mr-1.5">AI Confidence:</span>
                            <span className="text-sm">{qualityData.score}/10</span>
                        </div>
                    )}

                    <button
                        onClick={handleCopy}
                        className="flex items-center px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm active:scale-95"
                    >
                        {copied ? <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-400" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm active:scale-95"
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Save as PDF
                    </button>
                    {/* {requestId && (
                        <SubmissionPackButton
                            requestId={requestId}
                            patientName={extractedData?.patientRaw?.name}
                        />
                    )} */}
                    <button
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        className="flex items-center px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Refining...' : 'Regenerate'}
                    </button>
                </div>
            </div>

            {/* Human Review Layer */}
            <div className="bg-amber-50 border-b border-amber-100 p-3 px-4 flex flex-col md:flex-row md:items-start justify-between gap-3 text-sm">

                <div className="flex-1">
                    <div className="flex items-center space-x-4 text-amber-900 mb-1">
                        <span className="font-bold flex items-center text-xs uppercase tracking-wider text-amber-600/80">
                            <CheckCheck className="w-3 h-3 mr-1" /> Human Review
                        </span>
                        {extractedData && (
                            <div className="hidden md:flex items-center space-x-3 text-xs opacity-75">
                                <span>Patient: <b>{extractedData.patientRaw?.name || 'N/A'}</b></span>
                                <span className="w-1 h-3 border-r border-amber-300/50"></span>
                                <span>CPT: <b>{extractedData.cptCodes?.join(', ') || 'None'}</b></span>
                            </div>
                        )}
                    </div>

                    {/* 🚨 CRITICAL AI FEEDBACK: Show "Reasoning" if score is low */}
                    {qualityData?.score !== undefined && qualityData.score !== null && qualityData.score < 80 && qualityData.reasoning && (
                        <div className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                            <strong className="block mb-1 font-semibold flex items-center">
                                <ShieldAlert className="w-3 h-3 mr-1" /> Denial Risk Detected:
                            </strong>
                            {qualityData.reasoning}
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-4 self-start md:self-center mt-2 md:mt-0">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                        <input type="checkbox" checked={verifiedCodes} onChange={(e) => setVerifiedCodes(e.target.checked)} className="rounded text-amber-600 focus:ring-amber-500 bg-white border-amber-300" />
                        <span className="text-xs font-medium text-amber-800 group-hover:text-amber-900">Verify Codes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                        <input type="checkbox" checked={verifiedClinical} onChange={(e) => setVerifiedClinical(e.target.checked)} className="rounded text-amber-600 focus:ring-amber-500 bg-white border-amber-300" />
                        <span className="text-xs font-medium text-amber-800 group-hover:text-amber-900">Verify Clinical</span>
                    </label>
                    {onSave && (
                        <button
                            disabled={!verifiedCodes || !verifiedClinical}
                            onClick={() => onSave(true)}
                            className="bg-amber-100/50 hover:bg-emerald-100 text-amber-700 hover:text-emerald-700 px-3 py-1 rounded-md text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {verifiedCodes && verifiedClinical ? 'Verify & Sign' : 'Review Required'}
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-slate-50/30 scroll-smooth">
                {mode === 'preview' ? (
                    <article id="preview-content" className="prose prose-slate prose-headings:font-bold prose-h1:text-2xl prose-h1:text-slate-800 prose-h2:text-lg prose-h2:text-slate-700 prose-p:text-slate-600 prose-strong:text-slate-900 prose-ul:list-disc prose-li:text-slate-600 max-w-none p-8 md:p-12 bg-white min-h-full shadow-sm mx-auto w-full md:w-[95%] lg:w-[90%] my-4 md:my-8 rounded-xl border border-slate-100">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </article>
                ) : (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full p-6 font-mono text-sm leading-relaxed text-slate-600 bg-white focus:ring-0 border-none resize-none outline-none"
                        spellCheck={false}
                        placeholder="Generated content will appear here..."
                    />
                )}
            </div>
        </div>
    );
}
