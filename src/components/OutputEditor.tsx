'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Download, RefreshCw, CheckCheck, FileText, Code, Edit3, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';


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
    onStartOver?: () => void;
    requestId?: string; // For submission pack export
}

export function OutputEditor({ initialContent, onRegenerate, isGenerating, extractedData, qualityData, onSave, onStartOver, requestId }: OutputEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [copied, setCopied] = useState(false);
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');

    // Verification State
    const [verifiedCodes, setVerifiedCodes] = useState(false);
    const [verifiedClinical, setVerifiedClinical] = useState(false);
    // const [verifiedPatient, setVerifiedPatient] = useState(false); // Unused
    const [verifiedLiability, setVerifiedLiability] = useState(false);

    const isFullyVerified = verifiedCodes && verifiedClinical && verifiedLiability;

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
            if (typeof window === 'undefined') return;

            // Ensure mode is preview
            if (mode !== 'preview') {
                setMode('preview');
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            const element = document.getElementById('preview-content');
            if (!element) {
                alert('Could not find document content. Please switch to Preview mode.');
                return;
            }

            // Create hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) {
                document.body.removeChild(iframe);
                throw new Error('Could not create print iframe');
            }

            // Write content
            const date = new Date().toLocaleDateString();
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Medical Pre-Authorization</title>
                    <style>
                        @page { margin: 0.5in; size: letter; }
                        body { 
                            font-family: Arial, Helvetica, sans-serif; 
                            line-height: 1.5; 
                            color: #000;
                            margin: 0;
                            padding: 20px;
                        }
                        h1 { font-size: 18pt; margin-bottom: 16px; page-break-after: avoid; }
                        h2 { font-size: 14pt; margin-top: 20px; margin-bottom: 12px; page-break-after: avoid; }
                        h3 { font-size: 12pt; margin-top: 16px; margin-bottom: 8px; page-break-after: avoid; }
                        p { margin-bottom: 10px; font-size: 11pt; text-align: justify; }
                        ul, ol { margin-bottom: 10px; padding-left: 24px; }
                        li { margin-bottom: 4px; font-size: 11pt; }
                        .header { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                        .footer { margin-top: 30px; font-size: 8pt; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
                        
                        /* Strip Tailwind classes impact */
                        * { box-sizing: border-box; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <strong>Pre-Authorization Request</strong><br>
                        Generated: ${date}
                    </div>
                    
                    ${element.innerHTML}
                    
                    <div class="footer">
                        Generated by ARM Health AI • HIPAA Compliant Output
                    </div>
                </body>
                </html>
            `);
            doc.close();

            // Wait for resources then print
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();

                // Cleanup after print dialog usage (approx 1s delay to ensure dialog opened)
                // Note: We can't detect when print dialog closes in all browsers, 
                // but removing iframe immediately usually works after print() returns or blocks.
                // Safest is to leave it or remove after a delay.
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }, 500);

        } catch (error) {
            console.error('PDF Generation Failed:', error);
            // Last resort fallback
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
                        disabled={!isFullyVerified}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors shadow-sm active:scale-95 ${isFullyVerified
                            ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        title={!isFullyVerified ? "Please complete verification below" : "Copy to clipboard"}
                    >
                        {copied ? <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className={`w-3.5 h-3.5 mr-1.5 ${isFullyVerified ? 'text-slate-400' : 'text-slate-300'}`} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={!isFullyVerified}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors shadow-sm active:scale-95 ${isFullyVerified
                            ? 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        title={!isFullyVerified ? "Please complete verification below" : "Download PDF"}
                    >
                        <Download className={`w-3.5 h-3.5 mr-1.5 ${isFullyVerified ? 'text-blue-100' : 'text-slate-300'}`} /> Save as PDF
                    </button>

                    <button
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        className="flex items-center px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Refining...' : 'Regenerate'}
                    </button>
                    {onStartOver && (
                        <button
                            onClick={onStartOver}
                            disabled={isGenerating}
                            className="flex items-center px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ml-2"
                        >
                            Start New Request
                        </button>
                    )}
                </div>
            </div>

            {/* Human Review & Sign-Off Layer */}
            <div className="bg-amber-50 border-b border-amber-100 p-4">
                <div className="flex flex-col xl:flex-row gap-4 justify-between">

                    {/* Left: Next Steps / Manifest */}
                    <div className="flex-1 bg-white/50 rounded-lg p-3 border border-amber-100">
                        <h4 className="flex items-center text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
                            <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                            Next Steps & Submission Manifest
                        </h4>
                        <p className="text-xs text-amber-800 mb-2 leading-relaxed">
                            This generated ID is <b>Reference Only</b>. To submit to the payer, you must bundle this letter with:
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-semibold text-amber-900">
                            <li className="flex items-center bg-amber-100/50 px-2 py-1.5 rounded border border-amber-200/50">
                                <span className="mr-1.5">1.</span> Original Clinical Notes
                            </li>
                            <li className="flex items-center bg-amber-100/50 px-2 py-1.5 rounded border border-amber-200/50">
                                <span className="mr-1.5">2.</span> Imaging Reports (PDF)
                            </li>
                            <li className="flex items-center bg-amber-100/50 px-2 py-1.5 rounded border border-amber-200/50">
                                <span className="mr-1.5">3.</span> Patient Insurance Card
                            </li>
                        </ul>
                    </div>

                    {/* Right: Active Verification */}
                    <div className="xl:w-[28rem] flex flex-col justify-center space-y-3 pl-0 xl:pl-4 xl:border-l border-amber-200/50">
                        <div className="flex items-center justify-between text-xs font-medium text-amber-900/60 mb-1">
                            <span>Verification Protocol</span>
                            <span className={isFullyVerified ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                                {isFullyVerified ? "✓ READY TO EXPORT" : "ACTION REQUIRED"}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-start space-x-2 cursor-pointer group p-1.5 hover:bg-amber-100/30 rounded transition-colors">
                                <input type="checkbox" checked={verifiedCodes} onChange={(e) => setVerifiedCodes(e.target.checked)}
                                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 bg-white border-amber-300" />
                                <span className="text-[11px] font-medium text-amber-800 leading-tight">
                                    I have verified that the <b>CPT & ICD-10 Codes</b> match the clinical notes.
                                </span>
                            </label>

                            <label className="flex items-start space-x-2 cursor-pointer group p-1.5 hover:bg-amber-100/30 rounded transition-colors">
                                <input type="checkbox" checked={verifiedClinical} onChange={(e) => setVerifiedClinical(e.target.checked)}
                                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 bg-white border-amber-300" />
                                <span className="text-[11px] font-medium text-amber-800 leading-tight">
                                    I have verified the <b>Clinical Narrative</b> is factually accurate.
                                </span>
                            </label>

                            <label className="flex items-start space-x-2 cursor-pointer group bg-amber-100/50 p-2 rounded border border-amber-200 transition-all hover:bg-amber-100">
                                <input type="checkbox" checked={verifiedLiability} onChange={(e) => setVerifiedLiability(e.target.checked)}
                                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 bg-white border-amber-400" />
                                <span className="text-[11px] font-bold text-amber-900 leading-tight">
                                    I attest that this content is AI-Generated/Assisted and I have verified it for submission safety.
                                </span>
                            </label>
                        </div>
                    </div>
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
