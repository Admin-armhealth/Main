'use client';

import { useState, useEffect } from 'react';
import { FileText, Calendar, Filter, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stats') // We reused stats API earlier which has 'recentRequests', but ideally we need a full list API
            // For MVP we can just use the recent ones or create a dedicated list API.
            // Let's assume we use the recent list for now or fetch from a new endpoint?
            // Actually, let's just make a quick /api/requests/list endpoint if we want it to be real.
            // Or re-use policies list pattern but for requests.
            .then(res => res.json())
            .then(data => {
                if (data.stats?.recentRequests) setRequests(data.stats.recentRequests);
                setLoading(false);
            })
            .catch(e => setLoading(false));
    }, []);

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Case History</h1>
                    <p className="text-gray-500">View your past authorization requests and appeals.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-sm text-slate-700">Case / Title</th>
                                <th className="px-6 py-4 font-semibold text-sm text-slate-700">Type</th>
                                <th className="px-6 py-4 font-semibold text-sm text-slate-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-sm text-slate-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-sm text-slate-700"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requests.map((r) => {
                                const isApproved = r.output_data?.overall_status === 'APPROVED';
                                return (
                                    <tr key={r.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{r.title || 'Untitled'}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-1">{r.id.slice(0, 8)}...</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium capitalize">
                                                {r.request_type?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' // Simple heuristic
                                                }`}>
                                                {r.status === 'completed' ? (isApproved ? 'Approved' : 'Denied Risk') : r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-blue-600">
                                                <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        No history found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
