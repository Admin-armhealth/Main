'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Mail, ArrowLeft, Loader2, KeyRound, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState('');

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Check Your Email
                        </h2>
                        <p className="text-slate-600 mb-6">
                            We've sent a password reset link to <strong>{email}</strong>.
                            Please check your inbox and follow the instructions.
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                            Didn't receive the email? Check your spam folder or try again.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center text-blue-600 hover:text-blue-500 font-medium"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
                <form onSubmit={handleResetRequest} className="space-y-6">
                    <div className="text-center mb-8">
                        <div className="mx-auto h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                            <KeyRound className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                            Forgot Password?
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            No worries! Enter your email and we'll send you a reset link.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                            {error}
                        </div>
                    )}

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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>

                    <div className="text-center mt-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-800"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
