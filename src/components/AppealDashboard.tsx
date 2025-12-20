import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, FileText, TrendingUp, ShieldAlert, Gavel, ShieldCheck } from 'lucide-react';


interface AppealDashboardProps {
    auditData: {
        approval_likelihood: number;
        confidence_level: string;
        checklist: Array<{ label: string; status: string; finding: string }>;
        missing_info: string[];
        denial_risk_factors: string[];
    };
    denialReason?: string;
}

export function AppealDashboard({ auditData, denialReason }: AppealDashboardProps) {
    const score = auditData.approval_likelihood || 0;

    // Determine Color based on Appeal Strength
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-emerald-600';
        if (s >= 50) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreLabel = (s: number) => {
        if (s >= 80) return 'STRONG REBUTTAL';
        if (s >= 50) return 'DEFENSIBLE';
        return 'WEAK ARGUMENT';
    };

    const getScoreGradient = (s: number) => {
        if (s >= 80) return 'stroke-emerald-500';
        if (s >= 50) return 'stroke-amber-400';
        return 'stroke-red-500';
    };

    // Calculate Gauge
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200 overflow-y-auto">
            {/* 1. Header Section */}
            <div className="p-6 bg-white border-b border-slate-200">
                <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-purple-100 text-purple-700 uppercase">
                        AI Appeal Strategist
                    </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Appeal Analysis</h2>
                <div className="text-xs text-slate-500 mt-1">
                    Denial Reason: <span className="text-slate-700 italic">"{denialReason || 'Unspecified'}"</span>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* ✅ CONFIDENCE SIGNALS FOR APPEALS */}
                {score >= 80 && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-5 rounded-r-xl mb-4">
                        <div className="flex items-start">
                            <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-green-900 text-lg">✅ Strong rebuttal — appeal has merit</p>
                                <p className="text-sm text-green-700 mt-1">
                                    This appeal directly addresses the denial reason with strong evidence. High likelihood of overturn.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {score >= 50 && score < 80 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-5 rounded-r-xl mb-4">
                        <div className="flex items-start">
                            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-yellow-900 text-lg">⚠️ Defensible appeal — reviewable case</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    You've addressed the denial reason, but evidence could be stronger. Consider adding more specific documentation.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {score >= 26 && score < 50 && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl mb-4">
                        <div className="flex items-start">
                            <XCircle className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-orange-900 text-lg">❌ Weak argument — high risk of denial</p>
                                <p className="text-sm text-orange-700 mt-1">
                                    The denial reason was not fully addressed or evidence is vague. Strengthen your case before appealing.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {score < 26 && (
                    <div className="bg-red-100 border-l-4 border-red-600 p-5 rounded-r-xl mb-4">
                        <div className="flex items-start">
                            <XCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-red-900 text-lg">🚫 Futile appeal — do not submit</p>
                                <p className="text-sm text-red-700 mt-1">
                                    This appeal does not address the denial reason. Submitting now will waste time and likely be rejected immediately.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Score Gauge Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="relative w-40 h-40">
                        {/* Background Circle */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                            <circle
                                cx="80" cy="80" r={radius}
                                stroke="currentColor" strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                className={`transition-all duration-1000 ease-out ${getScoreGradient(score)}`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-4xl font-black tracking-tighter ${getScoreColor(score)}`}>{score}%</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">STRENGTH</span>
                        </div>
                    </div>

                    <div className="text-center mt-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {score >= 80 ? <Gavel className="w-3 h-3 mr-1.5" /> : <AlertTriangle className="w-3 h-3 mr-1.5" />}
                            {getScoreLabel(score)}
                        </div>
                    </div>

                    {/* Simulated Verdict */}
                    <div className="w-full mt-6 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">EST. SUCCESS RATE</span>
                            <span className="font-bold text-slate-700">{score > 60 ? 'HIGH' : 'LOW'}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-slate-800 rounded-full transition-all duration-1000" style={{ width: `${score}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* 3. Rebuttal Checklist */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                            <ShieldAlert className="w-4 h-4 mr-2 text-slate-500" />
                            Missing Rebuttal Items
                        </h3>
                    </div>

                    {/* Blocking Items (Fail/Warn) */}
                    {auditData.checklist.filter(i => i.status !== 'PASS').map((item, idx) => (
                        <div key={idx} className="group bg-white p-4 rounded-xl border border-l-4 border-slate-200 hover:border-l-red-500 transition-all shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm">{item.label}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed pl-0">{item.finding}</p>
                                </div>
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
                                    <XCircle className="w-4 h-4" />
                                </span>
                            </div>
                            {/* Actionable Fix */}
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-blue-600 cursor-pointer hover:text-blue-700">
                                <span>Fix → Gain +15%</span>
                            </div>
                        </div>
                    ))}

                    {/* Missing Info */}
                    {auditData.missing_info.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <div className="flex items-center mb-2 text-red-800">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                <span className="text-xs font-bold uppercase">Critical Missing Data</span>
                            </div>
                            <ul className="space-y-1.5">
                                {auditData.missing_info.map((info, i) => (
                                    <li key={i} className="text-xs text-red-600 flex items-start">
                                        <span className="mr-1.5">•</span> {info}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Passing Items */}
                    {auditData.checklist.filter(i => i.status === 'PASS').length > 0 && (
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                            <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1.5" />
                                Strong Points Detected
                            </h4>
                            <ul className="space-y-2">
                                {auditData.checklist.filter(i => i.status === 'PASS').map((item, idx) => (
                                    <li key={idx} className="flex items-start text-xs text-emerald-700">
                                        <CheckCircle className="w-3.5 h-3.5 mr-2 mt-0.5 flex-shrink-0" />
                                        <span>{item.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* VISIBLE AUDIT FOOTER */}
            <div className="bg-slate-50 border-t border-slate-100 p-3 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1 text-indigo-400" />
                    AI Compliance Audit
                </div>
                <div>
                    Generated {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}
