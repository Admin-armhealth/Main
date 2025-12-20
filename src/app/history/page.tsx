'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Request {
    id: string;
    patient_name: string;
    payer: string;
    request_type: 'preauth' | 'appeal';
    created_at: string;
    metadata: any;
    generated_content: string;
    user_id?: string;
    creator_name?: string;
}

export default function HistoryPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'preauth' | 'appeal'>('all');
    const [search, setSearch] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    async function fetchRequests() {
        setLoading(true);
        const { data: requestsData, error } = await supabase
            .from('requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching requests:', error);
        } else if (requestsData) {
            // Manual Join to get User Names
            const userIds = Array.from(new Set(requestsData.map(r => r.user_id).filter(Boolean)));
            let profileMap = new Map<string, string>();

            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name')
                    .in('id', userIds);

                if (profiles) {
                    profiles.forEach(p => profileMap.set(p.id, p.full_name || 'Unknown'));
                }
            }

            const enriched = requestsData.map(req => ({
                ...req,
                creator_name: profileMap.get(req.user_id) || 'Unknown User'
            }));

            setRequests(enriched);
        }
        setLoading(false);
    }

    const handleDownload = () => {
        if (!selectedRequest?.generated_content) return;
        const element = document.createElement("a");
        const file = new Blob([selectedRequest.generated_content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${selectedRequest.patient_name || 'patient'}_authorization.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Request History</h1>
                    <p className="text-slate-600">View and manage your past authorization requests</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Search by patient name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('preauth')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'preauth' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                Pre-Auth
                            </button>
                            <button
                                onClick={() => setFilter('appeal')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'appeal' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                Appeals
                            </button>
                        </div>
                    </div>
                </div>

                {/* Request List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Loading...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">No requests found</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredRequests.map(req => (
                                <div
                                    key={req.id}
                                    onClick={() => setSelectedRequest(req)}
                                    className="p-6 hover:bg-slate-50 cursor-pointer transition"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900 mb-1">{req.patient_name || 'Unknown Patient'}</h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    <span className={`inline-block w-2 h-2 rounded-full ${req.request_type === 'preauth' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                                                    {req.request_type === 'preauth' ? 'Pre-Auth' : 'Appeal'}
                                                </span>
                                                <span className="text-slate-400">|</span>
                                                <span>{req.payer || 'No payer specified'}</span>
                                                <span className="text-slate-400">|</span>
                                                <span title={new Date(req.created_at).toLocaleString()}>
                                                    {new Date(req.created_at).toLocaleDateString()} <span className="text-slate-400 text-xs">{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </span>
                                                <span className="text-slate-400">|</span>
                                                <span className="font-medium text-slate-700">by {req.creator_name}</span>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                            View Details →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedRequest(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedRequest.patient_name || 'Unknown Patient'}</h2>
                                    <p className="text-slate-600">{selectedRequest.payer} • {new Date(selectedRequest.created_at).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <div className="prose prose-slate max-w-none">
                                <pre className="whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                                    {selectedRequest.generated_content || 'No content available'}
                                </pre>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 bg-slate-50">
                            <button
                                onClick={handleDownload}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                            >
                                Download Letter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
