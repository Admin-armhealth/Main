'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Users, Mail, UserCircle } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
    npi?: string;
    tin?: string;
}

interface Member {
    user_id: string;
    role: string;
    created_at: string;
    profile?: {
        full_name?: string;
        npi?: string;
    };
}

export default function SettingsPage() {
    const [org, setOrg] = useState<Organization | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isOrgAdmin, setIsOrgAdmin] = useState(false);

    // Editing States
    const [editingOrg, setEditingOrg] = useState(false);
    const [orgForm, setOrgForm] = useState({ name: '', npi: '', tin: '' });

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
    const [generatedLink, setGeneratedLink] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchOrgData();
    }, []);

    async function fetchOrgData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: membership } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .single();

        if (membership) {
            setIsOrgAdmin(['owner', 'admin'].includes(membership.role));

            // 1. Fetch Org
            const { data: orgData } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', membership.organization_id)
                .single();

            setOrg(orgData);
            setOrgForm({
                name: orgData?.name || '',
                npi: orgData?.npi || '',
                tin: orgData?.tin || ''
            });

            // 2. Fetch Members
            const { data: membersData } = await supabase
                .from('organization_members')
                .select('*')
                .eq('organization_id', membership.organization_id);

            if (membersData) {
                // 3. Fetch Profiles manually to join
                const userIds = membersData.map(m => m.user_id);
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, npi')
                    .in('id', userIds);

                const mergedMembers = membersData.map(m => ({
                    ...m,
                    profile: profiles?.find(p => p.id === m.user_id)
                }));

                setMembers(mergedMembers);
            }
        }
    }

    async function updateOrgDetails() {
        setLoading(true);
        try {
            const response = await fetch('/api/org/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orgForm)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('✅ Clinic details updated');
                setOrg({ ...org!, ...orgForm });
                setEditingOrg(false);
            } else {
                console.error("Update Error:", data);
                setMessage(`❌ Failed: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Update Exception:", err);
            setMessage('❌ Network error');
        }
        setLoading(false);
        setTimeout(() => setMessage(''), 5000);
    }

    async function sendInvite() {
        setLoading(true);
        try {
            const response = await fetch('/api/org/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });

            const data = await response.json();

            if (response.ok) {
                setGeneratedLink(data.inviteLink);
                setMessage(''); // Clear any previous temporary messages
            } else {
                console.error("Invite Error:", data);
                setMessage(`❌ Failed: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Invite Exception:", err);
            setMessage('❌ Network or Server Error');
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
                    <p className="text-slate-600">Manage your clinic and team</p>
                </div>

                {/* Message Toast */}
                {message && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-sm animate-in fade-in slide-in-from-top-2">
                        {message}
                    </div>
                )}

                {/* Clinic Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Clinic Information</h2>
                                <p className="text-sm text-slate-600">Your organization details</p>
                            </div>
                        </div>
                        {!editingOrg && (
                            <button
                                onClick={() => setEditingOrg(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Edit Details
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Clinic Name */}
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Clinic Name</label>
                                {editingOrg ? (
                                    <input
                                        type="text"
                                        value={orgForm.name}
                                        onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        placeholder="Clinic Name"
                                    />
                                ) : (
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 font-medium text-slate-900">
                                        {org?.name || 'Unnamed Clinic'}
                                    </div>
                                )}
                            </div>

                            {/* NPI */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Organization NPI</label>
                                {editingOrg ? (
                                    <input
                                        type="text"
                                        value={orgForm.npi}
                                        onChange={(e) => setOrgForm({ ...orgForm, npi: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        placeholder="1234567890"
                                    />
                                ) : (
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 font-medium text-slate-900">
                                        {org?.npi || <span className="text-slate-400 italic">Not set</span>}
                                    </div>
                                )}
                            </div>

                            {/* TIN */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Tax ID (TIN)</label>
                                {editingOrg ? (
                                    <input
                                        type="text"
                                        value={orgForm.tin}
                                        onChange={(e) => setOrgForm({ ...orgForm, tin: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        placeholder="XX-XXXXXXX"
                                    />
                                ) : (
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 font-medium text-slate-900">
                                        {org?.tin || <span className="text-slate-400 italic">Not set</span>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {editingOrg && (
                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setEditingOrg(false)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={updateOrgDetails}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Management */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Team Members</h2>
                            <p className="text-sm text-slate-600">Providers and admins in your organization</p>
                        </div>
                    </div>

                    {/* Current Members */}
                    <div className="mb-8">
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.user_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 group hover:border-blue-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                            <UserCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            {member.profile?.full_name ? (
                                                <p className="font-semibold text-slate-900">{member.profile.full_name}</p>
                                            ) : (
                                                <p className="font-medium text-slate-500 italic">No Name Set</p>
                                            )}

                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>
                                                    {['admin', 'owner'].includes(member.role) ? 'Admin' : 'Member'}
                                                </span>
                                                {member.profile?.npi && (
                                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">NPI: {member.profile.npi}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${['admin', 'owner'].includes(member.role)
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-slate-200 text-slate-700'
                                            }`}>
                                            {['admin', 'owner'].includes(member.role) ? 'Admin' : 'Member'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Invite Member */}
                    <div className="pt-6 border-t border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Invite New Provider / Admin
                        </h3>

                        {!generatedLink ? (
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                />
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                                    className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <button
                                    onClick={sendInvite}
                                    disabled={loading || !inviteEmail}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 shadow-sm"
                                >
                                    Generate Link
                                </button>
                            </div>
                        ) : (
                            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-purple-900">Invitation Link Generated!</span>
                                    <button
                                        onClick={() => {
                                            setGeneratedLink('');
                                            setInviteEmail('');
                                            setMessage('');
                                        }}
                                        className="text-xs text-purple-600 hover:text-purple-800"
                                    >
                                        Send Another
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={generatedLink}
                                        className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded text-sm text-slate-600 outline-none"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedLink);
                                            setMessage('✅ Link copied to clipboard!');
                                        }}
                                        className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <p className="text-xs text-purple-600 mt-2">
                                    Share this link with <strong>{inviteEmail}</strong>. It expires in 7 days.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
