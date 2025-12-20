'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Download, FileType } from 'lucide-react';

export default function FormsPage() {
    const [sourceText, setSourceText] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filledPdfUrl, setFilledPdfUrl] = useState<string | null>(null);

    // File input ref for "Source Text" if we want to allow file upload later, 
    // but for now we'll stick to text area for simplicity as per plan.
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setPdfFile(e.target.files[0]);
            setFilledPdfUrl(null); // Reset previous result
        }
    };

    const handleProcess = async () => {
        if (!pdfFile || !sourceText) return;
        setIsProcessing(true);

        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('sourceText', sourceText);

        try {
            const res = await fetch('/api/fill-form', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to fill form');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            setFilledPdfUrl(url);
        } catch (error) {
            console.error(error);
            alert('Error filling form. Please ensure the PDF has interactive fields.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center space-x-3 mb-8">
                <div className="p-3 bg-purple-50 rounded-xl">
                    <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Auto-Fill Forms</h1>
                    <p className="text-slate-500">Upload an interactive PDF and let AI fill it from your notes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Inputs */}
                <div className="space-y-6">
                    {/* Step 1: Source Data */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                            <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                            Clinical Notes / Data Source
                        </h3>
                        <textarea
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="Paste patient history, diagnosis, and provider info here..."
                            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none resize-none"
                        />
                    </div>

                    {/* Step 2: Target PDF */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                            <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                            Target PDF Form
                        </h3>
                        <div
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${pdfFile ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-purple-300'}`}
                            onClick={() => pdfInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={pdfInputRef}
                                className="hidden"
                                accept="application/pdf"
                                onChange={handlePdfUpload}
                            />
                            <div className="flex flex-col items-center">
                                <FileType className={`w-8 h-8 mb-2 ${pdfFile ? 'text-purple-600' : 'text-slate-400'}`} />
                                <span className="text-sm font-medium text-slate-700">
                                    {pdfFile ? pdfFile.name : 'Click to Upload PDF'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleProcess}
                        disabled={!pdfFile || !sourceText || isProcessing}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isProcessing ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        ) : (
                            <FileText className="w-5 h-5 mr-2" />
                        )}
                        {isProcessing ? 'Processing...' : 'Fill Form with AI'}
                    </button>
                </div>

                {/* Right Column: Result */}
                <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                    {filledPdfUrl ? (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Form Filled Successfully!</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                The AI has mapped your data to the PDF fields. Download it to review/sign.
                            </p>
                            <a
                                href={filledPdfUrl}
                                download="filled_form.pdf"
                                className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                <Download className="w-5 h-5 mr-2" />
                                Download PDF
                            </a>
                        </div>
                    ) : (
                        <div className="text-slate-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Result will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
