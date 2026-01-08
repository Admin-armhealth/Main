
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, ShieldCheck, Activity } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams } from 'next/navigation';

export default function PolicyDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [policy, setPolicy] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<any[]>([]);

    useEffect(() => {
        const fetchPolicy = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // 1. Fetch Policy Metadata
            const { data: p, error } = await supabase
                .from('policies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching policy:", error);
                setLoading(false);
                return;
            }

            setPolicy(p);

            // 2. Fetch Sections (Content)
            const { data: s, error: sError } = await supabase
                .from('policy_sections')
                .select('*')
                .eq('policy_id', id)
                .order('display_order', { ascending: true });

            if (s) setSections(s);

            setLoading(false);
        };

        if (id) fetchPolicy();
    }, [id]);

    if (loading) return <div className="p-12 text-center text-slate-400">Loading policy details...</div>;
    if (!policy) return <div className="p-12 text-center text-red-500">Policy not found.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div>
                <Link href="/policies" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4 transition">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Library
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{policy.title}</h1>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                            <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                <ShieldCheck className="w-4 h-4 mr-1" />
                                {policy.payer || 'Unknown Payer'}
                            </span>
                            <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Updated: {new Date(policy.last_scraped_at || policy.created_at).toLocaleDateString()}
                            </span>
                            {policy.cpt_code && (
                                <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                                    {policy.cpt_code}
                                </span>
                            )}
                        </div>
                    </div>
                    {policy.source_url && (
                        <a
                            href={policy.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                            View Original <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                    )}
                </div>
            </div>

            {/* Content Sections */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {sections.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        No detailed content extracted for this policy yet.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {sections.map((section) => (
                            <div key={section.id} className="p-8">
                                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                                    {section.section_title === 'Full Policy Text' ? 'Policy Rules & Guidelines' : section.section_title}
                                </h3>
                                <div
                                    className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-blue-600"
                                    dangerouslySetInnerHTML={{ __html: section.content }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Explicit Source Footer */}
            {policy.source_url && (
                <div className="text-center pt-8 border-t border-slate-200 mt-8">
                    <p className="text-slate-500 mb-2">Data sourced from official payer documentation</p>
                    <a
                        href={policy.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Visit Official Source <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                </div>
            )}
        </div>
    );
}
