
import React, { useEffect, useState } from 'react';

interface LoadingOverlayProps {
    isGenerating: boolean;
    type: 'preauth' | 'appeal';
}

export function LoadingOverlay({ isGenerating, type }: LoadingOverlayProps) {
    const [messageIndex, setMessageIndex] = useState(0);

    const messages = type === 'preauth'
        ? [
            "Reading clinical notes...",
            "Matching CPT/ICD codes...",
            "Checking payer policies...",
            "Drafting Letter of Medical Necessity...",
            "Finalizing request..."
        ]
        : [
            "Analyzing denial letter...",
            "Identifying root cause...",
            "Formulating legal arguments...",
            "Citing clinical guidelines...",
            "Drafting Appeal Letter..."
        ];

    useEffect(() => {
        if (!isGenerating) {
            setMessageIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev < messages.length - 1 ? prev + 1 : prev));
        }, 4000); // Change message every 4 seconds to cover ~20s wait

        return () => clearInterval(interval);
    }, [isGenerating, messages.length]);

    if (!isGenerating) return null;

    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center max-w-sm w-full mx-4">
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">AI</span>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-2 animate-pulse">
                    Generating {type === 'preauth' ? 'Request' : 'Appeal'}
                </h3>

                <p className="text-slate-500 text-sm font-medium text-center h-5 transition-all duration-500 ease-in-out">
                    {messages[messageIndex]}
                </p>

                <div className="mt-6 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-[4000ms] ease-linear"
                        style={{
                            width: `${Math.min(((messageIndex + 1) / messages.length) * 100, 100)}%`
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
