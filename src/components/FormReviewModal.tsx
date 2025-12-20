
import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Download, AlertTriangle } from 'lucide-react';

interface FormReviewModalProps {
    fields: { [key: string]: string };
    onClose: () => void;
    onGenerate: (updatedFields: { [key: string]: string }) => Promise<void>;
    isGenerating: boolean;
    formName: string;
}

export function FormReviewModal({ fields, onClose, onGenerate, isGenerating, formName }: FormReviewModalProps) {
    const [localFields, setLocalFields] = useState<{ [key: string]: string }>(fields);

    // Create editable state
    useEffect(() => {
        setLocalFields(fields);
    }, [fields]);

    const handleChange = (key: string, val: string) => {
        setLocalFields(prev => ({ ...prev, [key]: val }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Review Form Data</h3>
                        <p className="text-sm text-slate-500">
                            AI extracted the following data for <span className="font-semibold text-blue-600">{formName}</span>.
                            Please verify and edit if needed.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Alert */}
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-amber-600" />
                        <div>
                            Please verify all fields. The AI may sometimes mismatch fields or miss specific details like Group IDs.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(localFields).map(([key, value]) => (
                            <div key={key}>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 capitalize truncate" title={key}>
                                    {key.replace(/_/g, ' ')}
                                </label>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end space-x-3 bg-white rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onGenerate(localFields)}
                        disabled={isGenerating}
                        className="flex items-center px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" /> Download Form
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
