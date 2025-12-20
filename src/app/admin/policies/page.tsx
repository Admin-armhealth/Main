'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RefreshCw, Globe, ArrowRight } from 'lucide-react';

export default function PolicyAdminPage() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Import State
    const [importUrl, setImportUrl] = useState('');
    const [importText, setImportText] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        setLoading(true);
        const { data } = await supabase.from('policies').select('*').order('created_at', { ascending: false });
        if (data) setPolicies(data);
        setLoading(false);
    };

    const handleImport = async () => {
        if (!importText && !importUrl) return;
        setIsImporting(true);
        setImportResult(null);

        try {
            const res = await fetch('/api/policies/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: importText, url: importUrl })
            });
            const data = await res.json();
            if (data.extracted) {
                setImportResult(data.extracted);
            } else if (data.error) {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Import failed');
        } finally {
            setIsImporting(false);
        }
    };

    const handleSave = async () => {
        if (!importResult) return;

        const { payer, cpt_codes, policy_content, title } = importResult;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user?.id).single();

            const records = (cpt_codes && cpt_codes.length > 0 ? cpt_codes : ['GENERAL']).map((cpt: string) => ({
                payer: payer || 'Unknown',
                cpt_code: cpt,
                title: title || 'Imported Policy',
                policy_content: policy_content,
                source_url: importUrl || null,
                organization_id: profile?.organization_id // Clinic Scope
            }));

            const { error } = await supabase.from('policies').insert(records);
            if (error) throw error;

            alert('Policy Saved to Knowledge Base!');
            setImportResult(null);
            setImportText('');
            setImportUrl('');
            fetchPolicies();

        } catch (e: any) {
            alert('Save failed: ' + e.message);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/policies/sync', { method: 'POST' });
            const data = await res.json();
            if (data.stats) {
                alert(`Sync Complete:\nUpdated: ${data.stats.updated.length}\nUnchanged: ${data.stats.unchanged}\nErrors: ${data.stats.errors.length}`);
                fetchPolicies();
            } else {
                alert(data.message || 'Sync failed');
            }
        } catch (e: any) {
            alert('Sync failed: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Policy Knowledge Base</h1>
                <p className="text-slate-600">The "Brain" that powers your AI's medical necessity checks.</p>
            </header>

            {/* IMPORTER */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span>🧠</span> Teach New Rules
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Source URL (Recommended)</label>
                                <input
                                    type="text"
                                    value={importUrl}
                                    onChange={e => setImportUrl(e.target.value)}
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="https://www.aetna.com/cpb/..."
                                />
                            </div>
                            <div className="text-center text-sm text-slate-400">- OR -</div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Paste Text Directly</label>
                                <textarea
                                    value={importText}
                                    onChange={e => setImportText(e.target.value)}
                                    className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
                                    placeholder="Paste policy text here..."
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleImport}
                            disabled={isImporting || (!importText && !importUrl)}
                            className="mt-4 w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                            {isImporting ? 'Analyzing...' : 'Analyze & Extract Rules'}
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">AI Extraction Preview</h3>
                        {importResult ? (
                            <div className="flex-1 flex flex-col space-y-4">
                                <div><span className="font-semibold">Payer:</span> {importResult.payer}</div>
                                <div><span className="font-semibold">Codes:</span> {importResult.cpt_codes?.join(', ')}</div>
                                <div className="flex-1 overflow-auto max-h-64 bg-white p-3 rounded border">
                                    <pre className="whitespace-pre-wrap font-sans text-sm">{importResult.policy_content}</pre>
                                </div>
                                <button
                                    onClick={handleSave}
                                    className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                                >
                                    Confirm & Save to Database
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
                                Extracted rules will appear here...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Active Policies ({policies.length})</h3>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 font-medium transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Checking for updates...' : 'Check for Updates'}
                    </button>
                </div>
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Loading...</div>
                    ) : policies.map(p => (
                        <div key={p.id} className="p-6 hover:bg-slate-50 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                        {p.payer}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 font-mono">
                                        {p.cpt_code}
                                    </span>
                                    {p.source_url && (
                                        <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-xs text-slate-400 hover:text-blue-600">
                                            <Globe className="w-3 h-3 mr-1" />
                                            Source
                                        </a>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-slate-400">
                                        {p.organization_id ? 'Clinic Rule' : 'Global Rule'}
                                    </span>
                                    {p.last_checked_at && (
                                        <span className="block text-[10px] text-slate-300">
                                            Last Checked: {new Date(p.last_checked_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h4 className="font-medium text-slate-900 mb-1">{p.title}</h4>
                            <p className="text-sm text-slate-600 line-clamp-2">{p.policy_content}</p>
                        </div>
                    ))}
                    {!loading && policies.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            No policies found. Try importing one above.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
