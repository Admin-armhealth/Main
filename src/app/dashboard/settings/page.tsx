'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Link2, Check, Users } from 'lucide-react';

export default function SettingsPage() {
    const [orgId, setOrgId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchOrg = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (profile?.organization_id) {
                setOrgId(profile.organization_id);
            }
        };
        fetchOrg();
    }, []);

    const inviteLink = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/signup?org=${orgId}` : '';

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
                <p className="text-slate-500">Manage your organization and team.</p>
            </div>

            {/* Invite Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mr-3">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Invite Team Members</h2>
                        <p className="text-sm text-slate-500">Share this link to allow others to join your organization.</p>
                    </div>
                </div>

                {orgId ? (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-600 truncate">
                            {inviteLink}
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all ${copied
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" /> Copied
                                </>
                            ) : (
                                <>
                                    <Link2 className="w-4 h-4 mr-2" /> Copy Link
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="text-sm text-slate-400 italic">
                        Loading organization info...
                    </div>
                )}
            </div>
        </div>
    );
}
