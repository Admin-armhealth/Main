'use client';

import { Eye, User } from 'lucide-react';

interface ReviewerModeToggleProps {
    reviewerMode: boolean;
    onToggle: () => void;
}

export function ReviewerModeToggle({ reviewerMode, onToggle }: ReviewerModeToggleProps) {
    return (
        <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">View as:</span>
            </div>

            <button
                onClick={onToggle}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${reviewerMode
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
            >
                {reviewerMode ? (
                    <>
                        <Eye className="w-4 h-4" />
                        Payer Reviewer
                    </>
                ) : (
                    <>
                        <User className="w-4 h-4" />
                        You (Provider)
                    </>
                )}
            </button>

            {reviewerMode && (
                <div className="flex-1 text-xs text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg">
                    <span className="font-semibold">Simulation Mode:</span> Seeing what the payer sees
                </div>
            )}
        </div>
    );
}
