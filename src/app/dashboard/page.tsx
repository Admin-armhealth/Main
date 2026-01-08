'use client';

import Link from 'next/link';
import { FileText, ShieldAlert, ArrowRight, TrendingUp, Clock, DollarSign, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stats')
            .then(res => res.json())
            .then(data => {
                if (data.stats) setStats(data.stats);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-gray-600">
                    Overview of your authorization performance.
                </p>
            </div>

            {/* ROI DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center text-slate-500 mb-2">
                        <Activity className="w-4 h-4 mr-2" />
                        <span className="text-xs font-medium uppercase tracking-wider">Total Auths</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {loading ? '...' : stats?.totalAuths || 0}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center text-emerald-600 mb-2">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span className="text-xs font-medium uppercase tracking-wider">Est. Savings</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-700">
                        {loading ? '...' : `$${stats?.totalSavedMoney?.toFixed(0) || 0}`}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">vs. Manual Admin</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center text-blue-600 mb-2">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-xs font-medium uppercase tracking-wider">Time Saved</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-700">
                        {loading ? '...' : `${stats?.totalSavedTimeHours?.toFixed(1) || 0}h`}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center text-purple-600 mb-2">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <span className="text-xs font-medium uppercase tracking-wider">Avg Quality</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-700">
                        {loading ? '...' : `${stats?.avgQuality || 0}/10`}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                    href="/preauth"
                    className="group block p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition border-l-4 border-l-blue-500"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">New Pre-Authorization</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Generate insurer-ready requests from clinical notes and codes.
                    </p>
                </Link>
                <Link
                    href="/appeal"
                    className="group block p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition border-l-4 border-l-amber-500"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">New Appeal Letter</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Draft strong appeal letters for denied claims using clinical evidence.
                    </p>
                </Link>
            </div>

            {/* ALERT: POLICY UPDATES */}
            {stats?.recentAlerts && stats.recentAlerts.length > 0 && (
                <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 overflow-hidden mb-8">
                    <div className="p-4 border-b border-amber-200 flex items-center justify-between bg-amber-100/50">
                        <div className="flex items-center text-amber-900 font-bold">
                            <ShieldAlert className="w-5 h-5 mr-2" />
                            Recent Policy Changes (Risk Alert)
                        </div>
                        <Link href="/policies" className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline">View Knowledge Graph</Link>
                    </div>
                    <div className="divide-y divide-amber-200/50">
                        {stats.recentAlerts.map((alert: any) => (
                            <div key={alert.id} className="p-4 flex items-start gap-3 hover:bg-amber-100/30 transition">
                                <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {alert.policies?.title || 'Unknown Policy'}
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1">
                                        {alert.change_summary || "Content mismatch detected on payer website."}
                                    </p>
                                    <div className="mt-1 flex gap-2 text-[10px] text-amber-700 font-mono items-center">
                                        <span className="bg-amber-200/50 px-1 rounded">
                                            {alert.policies?.payer || 'Payer'}
                                        </span>
                                        <span>Detected: {new Date(alert.detected_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* RECENT ACTIVITY */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                    <Link href="/history" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</Link>
                </div>
                {(!stats?.recentRequests || stats.recentRequests.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No recent activity found. Start a new check!
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {stats.recentRequests.map((req: any) => {
                            const isApproved = req.output_data?.overall_status === 'APPROVED' || !req.output_data; // Default to neutral if unknown
                            return (
                                <div key={req.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition">
                                                {req.title || 'Untitled Request'}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <span className="capitalize">{req.request_type ? req.request_type.replace('_', ' ') : 'Request'}</span>
                                                <span>•</span>
                                                <span>{new Date(req.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${req.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {stats?.topPayers?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h4 className="text-sm font-semibold text-slate-800 mb-4">Top Payers</h4>
                    <div className="space-y-3">
                        {stats.topPayers.map((p: any) => (
                            <div key={p.name} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{p.name}</span>
                                <div className="flex items-center">
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden mr-3">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${(p.count / stats.totalAuths) * 100}%` }}
                                        />
                                    </div>
                                    <span className="font-mono text-slate-900">{p.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
