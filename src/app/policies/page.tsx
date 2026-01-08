'use client';

import { useState, useEffect } from 'react';
import { Search, Book, Shield, Tag, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PolicyLibraryPage() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Debounce search could be added here, currently simplified
        const timer = setTimeout(() => {
            fetchPolicies();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    async function fetchPolicies() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.set('q', searchTerm);

            const res = await fetch(`/api/policies/list?${params.toString()}`);
            const data = await res.json();
            if (data.policies) {
                setPolicies(data.policies);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-6xl space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Policy Library</h1>
                    <p className="text-gray-500 mt-1">Browse and search the clinical policy engine rules.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        placeholder="Search by diagnosis, CPT, or payer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* QUICK ACTIONS / TAGS (Optional Future Feature) */}

            {/* GRID */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : policies.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <Book className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">No policies found</h3>
                    <p className="text-slate-500">Try adjusting your search terms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {policies.map((policy) => (
                        <Link
                            key={policy.id}
                            href={`/policies/${policy.id}`}
                            className="group bg-white rounded-xl border hover:shadow-lg transition-all duration-200 p-5 flex flex-col h-full"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded uppercase">
                                    {policy.payer || 'Global'}
                                </span>
                            </div>

                            <h3 className="font-semibold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {policy.title}
                            </h3>

                            <div className="mt-auto pt-4 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {policy.policy_codes?.slice(0, 3).map((c: any) => (
                                        <span key={c.code} className="inline-flex items-center text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                            <Tag className="h-3 w-3 mr-1 opacity-50" />
                                            {c.code}
                                        </span>
                                    ))}
                                    {policy.policy_codes?.length > 3 && (
                                        <span className="text-xs text-slate-400 py-1">+ {policy.policy_codes.length - 3} more</span>
                                    )}
                                </div>

                                <div className="flex items-center text-sm text-slate-400 pt-3 border-t border-slate-50">
                                    <span suppressHydrationWarning>Updated {new Date(policy.updated_at).toLocaleDateString()}</span>
                                    <ChevronRight className="ml-auto h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
