'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function DenialCheckPage() {
    const [note, setNote] = useState('');
    const [cptCode, setCptCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Auto-detect CPT codes from the note
    const handleNoteChange = (text: string) => {
        setNote(text);

        // Basic heuristic: look for 5-digit numbers. 
        // Improvement: Look for "CPT" or "Code" prefix, or just raw 5 digits.
        // We avoid strict dates/zips by simple context if possible, but for MVP simple regex is fine.
        const found = text.match(/\b\d{5}\b/);
        if (found && !cptCode) {
            setCptCode(found[0]);
        }
    };

    async function handleCheck() {
        if (!note || !cptCode) return;
        setLoading(true);
        setResult(null);

        try {
            // 1. Run Analysis
            const res = await fetch('/api/policies/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note, cptCode })
            });
            const data = await res.json();

            if (data.success) {
                setResult(data.analysis);

                // 2. Save to History (Fire and Forget or Await)
                // We await to show "Saved" status correctly.
                try {
                    await fetch('/api/requests/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            request_type: 'compliance_check',
                            title: `Check: CPT ${cptCode}`,
                            status: 'completed',
                            input_data: { cptCode, note_snippet: note.slice(0, 100) + '...' }, // Minimal metadata
                            output_data: data.analysis
                        })
                    });
                } catch (saveErr) {
                    console.error("Failed to save history", saveErr);
                }

            } else {
                alert(data.error || "Failed to verify");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Compliance Check (Denial Predictor)</h1>
                <p className="text-muted-foreground">
                    Enter a CPT code and clinical note to verify compliance against real insurer policies.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT: INPUT */}
                <div className="h-full rounded-lg border bg-card text-card-foreground shadow-sm bg-white">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-semibold leading-none tracking-tight">Request Details</h3>
                    </div>
                    <div className="p-6 pt-0 space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">CPT Code</label>
                            <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g. 76872"
                                value={cptCode}
                                onChange={(e) => setCptCode(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Clinical Note</label>
                            <textarea
                                placeholder="Paste note here... (e.g. Patient has back pain for 2 months...)"
                                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                value={note}
                                onChange={(e) => handleNoteChange(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleCheck}
                            disabled={loading || !note || !cptCode}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 w-full"
                        >
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : "Run Compliance Check"}
                        </button>
                    </div>
                </div>

                {/* RIGHT: RESULTS */}
                <div className="h-full rounded-lg border text-card-foreground shadow-sm bg-slate-50 border-slate-200">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-semibold leading-none tracking-tight">Analysis Scorecard</h3>
                    </div>
                    <div className="p-6 pt-0">
                        {!result && !loading && (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                Waiting for input...
                            </div>
                        )}

                        {loading && (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <p>Consulting Policy Engine...</p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {/* OVERALL STATUS */}
                                <div className={`p-4 rounded-lg border flex items-center gap-4 ${result.overall_status === 'APPROVED'
                                    ? 'bg-green-100 border-green-200 text-green-800'
                                    : 'bg-red-100 border-red-200 text-red-800'
                                    }`}>
                                    {result.overall_status === 'APPROVED'
                                        ? <CheckCircle2 className="h-8 w-8" />
                                        : <XCircle className="h-8 w-8" />
                                    }
                                    <div>
                                        <h3 className="font-bold text-lg">{result.overall_status === 'APPROVED' ? 'LIKELY APPROVED' : 'DENIAL RISK'}</h3>
                                        <p className="text-sm opacity-90">
                                            {result.overall_status === 'APPROVED'
                                                ? "Request meets all identified criteria."
                                                : "Critical information is missing."}
                                        </p>
                                    </div>
                                </div>

                                {/* MISSING INFO */}
                                {result.missing_info?.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                                            <AlertTriangle className="h-4 w-4" /> Missing / Unclear:
                                        </h4>
                                        <ul className="list-disc list-inside text-sm text-amber-900 space-y-1 ml-1">
                                            {result.missing_info.map((info: string, i: number) => (
                                                <li key={i}>{info}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* RULE BREAKDOWN */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Criteria Breakdown</h4>
                                    {result.analysis.map((rule: any, i: number) => (
                                        <div key={i} className={`text-sm p-3 rounded border ${rule.met ? 'bg-white border-green-200' : 'bg-white border-red-200'
                                            }`}>
                                            <div className="flex items-start gap-3">
                                                {rule.met
                                                    ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                                    : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                                }
                                                <div>
                                                    <p className="font-medium text-slate-700">{rule.rule_id}</p>
                                                    <p className="text-xs text-slate-500 mt-1 italic">
                                                        "{rule.evidence}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
