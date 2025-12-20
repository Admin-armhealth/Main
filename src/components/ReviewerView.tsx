import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ReviewerQuestion {
    id: string;
    text: string;
    severity: 'critical' | 'moderate' | 'minor';
}

interface ReviewerViewProps {
    questions: ReviewerQuestion[];
    likelyDecision: 'approve' | 'pend' | 'deny';
}

export function ReviewerView({ questions, likelyDecision }: ReviewerViewProps) {
    return (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-purple-200">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
                <div>
                    <h3 className="font-bold text-purple-900 text-lg">What a Reviewer Will Question</h3>
                    <p className="text-sm text-purple-700">These are the items a payer will scrutinize</p>
                </div>
            </div>

            {/* Questions List */}
            {questions.length > 0 ? (
                <ul className="space-y-3">
                    {questions.map(q => (
                        <li key={q.id} className="flex items-start gap-3 bg-white p-4 rounded-lg border-l-4 border-purple-400">
                            <HelpCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${q.severity === 'critical' ? 'text-red-600' :
                                    q.severity === 'moderate' ? 'text-yellow-600' :
                                        'text-slate-500'
                                }`} />
                            <div className="flex-1">
                                <p className="text-purple-900 font-medium">{q.text}</p>
                                <span className={`text-xs font-bold uppercase mt-1 inline-block ${q.severity === 'critical' ? 'text-red-700' :
                                        q.severity === 'moderate' ? 'text-yellow-700' :
                                            'text-slate-600'
                                    }`}>
                                    {q.severity}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="bg-white p-6 rounded-lg text-center text-purple-700">
                    <p className="font-medium">No obvious reviewer concerns detected</p>
                    <p className="text-sm text-purple-600 mt-1">This request appears complete from a payer's perspective</p>
                </div>
            )}

            {/* Simulated Decision */}
            <div className="pt-4 border-t border-purple-200">
                <p className="text-sm text-purple-700 font-semibold mb-3">Likely Reviewer Action:</p>
                <div className="flex gap-2">
                    <button className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition ${likelyDecision === 'approve'
                            ? 'bg-green-600 text-white ring-2 ring-green-700'
                            : 'bg-green-100 text-green-800 opacity-50'
                        }`}>
                        ✓ Approve
                    </button>
                    <button className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition ${likelyDecision === 'pend'
                            ? 'bg-yellow-600 text-white ring-2 ring-yellow-700'
                            : 'bg-yellow-100 text-yellow-800 opacity-50'
                        }`}>
                        ⏸ Pend (More Info)
                    </button>
                    <button className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition ${likelyDecision === 'deny'
                            ? 'bg-red-600 text-white ring-2 ring-red-700'
                            : 'bg-red-100 text-red-800 opacity-50'
                        }`}>
                        ✗ Deny
                    </button>
                </div>
            </div>
        </div>
    );
}
