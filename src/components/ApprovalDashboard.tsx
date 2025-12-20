import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, AlertCircle, ArrowUpCircle, Ban } from 'lucide-react';
import { ReviewerModeToggle } from './ReviewerModeToggle';
import { ReviewerView } from './ReviewerView';

interface ApprovalDashboardProps {
    data: {
        approval_likelihood: number | null;
        clinical_score?: number;
        admin_score?: number;
        overall_status?: 'ready' | 'blocked' | 'high_risk';
        simulated_verdict?: string;
        checklist: Array<{
            label: string;
            status: 'PASS' | 'FAIL' | 'WARN';
            finding: string;
            score_impact?: number;
        }>;
        missing_info: string[];
        denial_risk_factors: Array<string | { risk: string; severity: 'critical' | 'moderate' | 'low'; rationale?: string }>;
        primary_risk_factor?: { type: string; message: string };
    };
    isVisible: boolean;
}

export function ApprovalDashboard({ data, isVisible }: ApprovalDashboardProps) {
    const [reviewerMode, setReviewerMode] = useState(false);
    if (!isVisible || data.approval_likelihood === null) return null;

    const score = data.approval_likelihood;
    const verdict = data.simulated_verdict || (score > 80 ? 'Approve' : score > 50 ? 'Conditional' : 'Deny');
    const missingItems = data.missing_info || [];
    const risks = data.denial_risk_factors || [];
    const passedCriteria = data.checklist.filter(c => c.status === 'PASS').length;

    // Design Theme based on Verdict
    let theme = { color: 'emerald', icon: CheckCircle2, badge: 'Low Risk' };
    if (verdict === 'Deny') theme = { color: 'rose', icon: XCircle, badge: 'High Risk' };
    if (verdict === 'Conditional') theme = { color: 'amber', icon: AlertTriangle, badge: 'Medium Risk' };

    const StatusIcon = theme.icon;
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    // ---------------------------------------------------------
    // 🛡️ ENTERPRISE HARDENING: UX ENFORCEMENT
    // ---------------------------------------------------------
    const isBlocked = data.overall_status === 'blocked';

    // Risk Factor Extraction
    const primaryRisk = data.primary_risk_factor;
    const isMismatch = primaryRisk?.type === 'clinical_mismatch';

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'ready': return 'bg-emerald-100 text-emerald-800';
            case 'blocked': return 'bg-red-100 text-red-800';
            case 'high_risk': return 'bg-amber-100 text-amber-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getStatusLabel = (status: string | undefined) => {
        switch (status) {
            case 'ready': return 'READY TO SUBMIT';
            case 'blocked': return 'SUBMISSION BLOCKED';
            case 'high_risk': return 'HIGH DENIAL RISK';
            default: return status?.toUpperCase() || 'UNKNOWN';
        }
    };

    // 👁️ REVIEWER MODE: Generate questions from risk factors
    const generateReviewerQuestions = () => {
        const questions: Array<{ id: string; text: string; severity: 'critical' | 'moderate' | 'minor' }> = [];

        // From missing info
        missingItems.forEach((item, idx) => {
            questions.push({
                id: `missing-${idx}`,
                text: `Missing: ${item}`,
                severity: 'critical'
            });
        });

        // From risk factors
        risks.forEach((risk, idx) => {
            const riskText = typeof risk === 'string' ? risk : risk.risk;
            const severity = typeof risk === 'object' ? risk.severity : 'moderate';

            questions.push({
                id: `risk-${idx}`,
                text: riskText,
                severity: severity === 'critical' ? 'critical' : severity === 'low' ? 'minor' : 'moderate'
            });
        });

        // From failed checklist items
        data.checklist.filter(c => c.status === 'FAIL').forEach((item, idx) => {
            questions.push({
                id: `check-${idx}`,
                text: item.finding,
                severity: 'moderate'
            });
        });

        return questions.slice(0, 5); // Limit to top 5
    };

    const reviewerQuestions = generateReviewerQuestions();

    // Simulated reviewer decision
    const getReviewerDecision = (): 'approve' | 'pend' | 'deny' => {
        if (isBlocked || score < 40) return 'deny';
        if (score >= 75) return 'approve';
        return 'pend';
    };

    const reviewerDecision = getReviewerDecision();


    return (
        <div className="space-y-6">

            {/* 🔴 CRITICAL WARNING: BLUNT MESSAGING */}
            {isBlocked && (
                <div className="bg-red-100 border-2 border-red-600 rounded-xl p-6 mb-6 shadow-lg">
                    <div className="flex items-start">
                        <Ban className="w-10 h-10 text-red-600 mr-4 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="text-2xl font-black text-red-900 mb-3">
                                ⛔ Submitting now will likely result in denial
                            </h3>
                            <p className="text-red-800 mb-4 text-base leading-relaxed">
                                {isMismatch
                                    ? "Critical mismatch detected: The diagnosis does not support the requested procedure. Reviewers will reject this immediately."
                                    : "This request is missing critical documentation that insurance reviewers require. Fix the highlighted issues before submission."
                                }
                            </p>
                            <div className="bg-red-50 border-l-4 border-red-700 p-4 rounded">
                                <p className="text-sm text-red-900 font-semibold">
                                    📋 The score below is informational only. You cannot submit until blockers are resolved.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        Can I submit this request?
                    </h2>
                    <p className="text-slate-500 mt-1">
                        AI Pre-Screening Analysis
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center ${getStatusColor(data.overall_status)}`}>
                    {data.overall_status === 'blocked' && <Ban className="w-4 h-4 mr-2" />}
                    Status: {getStatusLabel(data.overall_status)}
                </div>
            </div>

            {/* 👁️ REVIEWER MODE TOGGLE */}
            <ReviewerModeToggle
                reviewerMode={reviewerMode}
                onToggle={() => setReviewerMode(!reviewerMode)}
            />

            {/* 👁️ REVIEWER MODE PANEL */}
            {reviewerMode && (
                <ReviewerView
                    questions={reviewerQuestions}
                    likelyDecision={reviewerDecision}
                />
            )}

            {/* ✅ CONFIDENCE SIGNALS (Positive Reassurance) */}
            {!isBlocked && score >= 85 && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-xl shadow-sm">
                    <div className="flex items-start gap-4">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-emerald-900 text-lg leading-snug">✅ This request would pass initial intake screening</p>
                            <p className="text-sm text-emerald-700 mt-2 leading-relaxed">
                                No reviewer red flags detected. All required fields are present and well-documented.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!isBlocked && score >= 70 && score < 85 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl shadow-sm">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-amber-900 text-lg leading-snug">⚠️ Reviewable case — consider strengthening documentation</p>
                            <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                                Meets minimum threshold for submission. Adding imaging dates or therapy logs could improve approval odds.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!isBlocked && score >= 40 && score < 70 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-xl shadow-sm">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="w-7 h-7 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-orange-900 text-lg leading-snug">❌ High risk — missing critical documentation</p>
                            <p className="text-sm text-orange-700 mt-2 leading-relaxed">
                                This request has gaps that reviewers will likely pend or deny. Review missing items below before submitting.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!isBlocked && score < 40 && (
                <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-xl shadow-sm">
                    <div className="flex items-start gap-4">
                        <XCircle className="w-7 h-7 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-900 text-lg leading-snug">🚫 Submitting now will likely result in denial</p>
                            <p className="text-sm text-red-700 mt-2 leading-relaxed">
                                Critical evidence is missing. Reviewers will deny or return this request unprocessed. Fix highlighted issues first.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SCORE CARD (Dimmed if blocked, Hidden in Reviewer Mode) */}
            {!reviewerMode && (
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-300 ${isBlocked ? 'opacity-40 grayscale select-none pointer-events-none' : ''}`}>

                    {/* 1. SIMULATED VERDICT HEADER */}
                    <div className={`col-span-3 md:col-span-1 rounded-3xl border-2 p-6 flex flex-col items-center justify-center text-center ${theme.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                        theme.color === 'amber' ? 'bg-amber-50 border-amber-100' :
                            'bg-rose-50 border-rose-100'
                        }`}>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Simulated Decision
                        </div>
                        <StatusIcon className={`w-12 h-12 mb-3 ${theme.color === 'emerald' ? 'text-emerald-600' :
                            theme.color === 'amber' ? 'text-amber-600' :
                                'text-rose-600'
                            }`} />
                        <div className={`text-2xl font-black tracking-tight ${theme.color === 'emerald' ? 'text-emerald-800' :
                            theme.color === 'amber' ? 'text-amber-800' :
                                'text-rose-800'
                            }`}>
                            {verdict.toUpperCase()}
                        </div>
                    </div>

                    {/* 2. CLINICAL CONFIDENCE (Medical Necessity) */}
                    <div className="col-span-3 md:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col items-center justify-center p-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Medical Necessity Score</h3>

                        <div className="relative inline-flex items-center justify-center">
                            <svg className="w-32 h-32 transform -rotate-90">
                                <circle cx="64" cy="64" r="58" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                                <circle
                                    cx="64" cy="64" r="58"
                                    stroke={theme.color === 'emerald' ? '#10b981' : theme.color === 'amber' ? '#f59e0b' : '#f43f5e'}
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-3xl font-black text-slate-800">{score}%</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. SUBMISSION READINESS (Admin) */}
                    <div className="col-span-3 md:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${missingItems.length === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            Admin Checks
                        </h4>

                        {missingItems.length === 0 && risks.length === 0 ? (
                            <div className="flex items-center text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                All clear.
                            </div>
                        ) : (
                            <div className="space-y-2 overflow-y-auto max-h-[140px] pr-2">
                                {/* Display Primary Risk if it exists */}
                                {data.primary_risk_factor && (
                                    <div className="flex items-start text-xs text-rose-800 bg-rose-100 p-2 rounded border border-rose-200 font-bold">
                                        <span className="mr-1">⚠️</span> {data.primary_risk_factor.message}
                                    </div>
                                )}

                                {missingItems.map((m, i) => (
                                    <div key={`miss-${i}`} className="flex items-center text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-100">
                                        <span className="font-bold mr-1">MISSING:</span> {m}
                                    </div>
                                ))}
                                {risks.map((r, i) => (
                                    <div key={`risk-${i}`} className="flex items-start text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                                        <span className="font-bold mr-1">RISK:</span>
                                        {typeof r === 'string' ? r : r.risk}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            )}

            {/* Checklist Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-4">Evidence Analysis Details</h4>
                <div className="space-y-3">
                    {data.checklist.map((item, i) => (
                        <div key={i} className={`p-3 rounded-xl border flex items-start justify-between group transition-all ${item.status === 'PASS' ? 'bg-white border-slate-100' :
                            'bg-white border-l-4 border-l-rose-500 border-slate-200'
                            }`}>
                            <div className="flex-1">
                                <span className={`text-xs font-bold uppercase ${item.status === 'PASS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {item.status}
                                </span>
                                <div className="text-xs font-semibold text-slate-700 mt-0.5">{item.label}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{item.finding}</div>
                            </div>

                            {/* FIX -> GAIN Badge */}
                            {item.status !== 'PASS' && (item.score_impact || 0) > 0 && (
                                <div className="ml-3 flex flex-col items-center justify-center">
                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 mb-1">
                                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                                        +{item.score_impact}%
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium">Potential Gain</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
