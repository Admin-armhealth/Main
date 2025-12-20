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
