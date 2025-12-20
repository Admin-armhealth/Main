'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, ArrowRight, Loader2, Users } from 'lucide-react';

import Link from 'next/link';

interface SignupFormProps {
    inviteOrgId?: string;
    inviteToken?: string;
    inviteOrgName?: string; // Optional: Display name if we fetched it
}

export default function SignupForm({ inviteOrgId, inviteToken, inviteOrgName }: SignupFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Sign Up with Hospital Name in Metadata (only if new org)
            const metaData: any = {
                full_name: `${firstName} ${lastName}`.trim()
            };

            if (!inviteOrgId) {
                metaData.hospital_name = hospitalName;
            } else {
                metaData.joined_via_invite = inviteOrgId;
            }

            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metaData
                }
            });

            if (authError) throw authError;

            if (data.user) {
                // Check if session is active
                if (data.session) {
                    try {
                        let finalOrgId = inviteOrgId;

                        // If NOT joining an invite, Create New Org using API (bypasses RLS)
                        if (!finalOrgId) {
                            const orgResponse = await fetch('/api/org/create', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${data.session.access_token}`
                                },
                                body: JSON.stringify({
                                    name: hospitalName,
                                    userId: data.user.id
                                })
                            });

                            if (orgResponse.ok) {
                                const orgData = await orgResponse.json();
                                finalOrgId = orgData.organizationId;
                            } else {
                                throw new Error('Failed to create organization');
                            }
                        } else {
                            // Joining existing org via invite
                            const joinResponse = await fetch('/api/org/join', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${data.session.access_token}`
                                },
                                body: JSON.stringify({
                                    organizationId: inviteOrgId,
                                    inviteToken: inviteToken,
                                    userId: data.user.id,
                                    fullName: `${firstName} ${lastName}`.trim()
                                })
                            });

                            if (!joinResponse.ok) {
                                throw new Error('Failed to join organization');
                            }
                        }
                    } catch (err) {
                        console.error("Org creation error:", err);
                        setError('Account created but organization setup failed. Please contact support.');
                        setLoading(false);
                        return;
                    }

                    // Force Sign Out to redirect to Login
                    await supabase.auth.signOut();
                    router.push('/login');
                } else {
                    // Email confirmation required case
                    router.push('/login');
                }
            }

        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSignup} className="space-y-6">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                    {error}
                </div>
            )}

            {/* If Invite: Show "Joining Team" Banner. If New: Show Hospital Input */}
            {inviteOrgId ? (
                <div className="bg-blue-50 p-4 rounded-lg flex items-center border border-blue-100">
                    <Users className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                        <div className="text-sm font-semibold text-blue-800">Joining Existing Team</div>
                        <div className="text-xs text-blue-600">
                            You will be added to <strong>{inviteOrgName || 'Organization'}</strong>
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Hospital / Clinic Name
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Building2 className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            required
                            value={hospitalName}
                            onChange={(e) => setHospitalName(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="General Hospital"
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        First Name
                    </label>
                    <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="John"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Last Name
                    </label>
                    <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Doe"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="you@clinic.com"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        {inviteOrgId ? 'Join Team' : 'Create Account'} <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                )}
            </button>

            <div className="text-center mt-4">
                <p className="text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Sign in
                    </Link>
                </p>
            </div>
        </form >
    );
}
