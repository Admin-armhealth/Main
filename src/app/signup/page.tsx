'use client';

import SignupForm from '@/components/SignupForm';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignupContent() {
    const searchParams = useSearchParams();
    const inviteOrgId = searchParams.get('org');
    const inviteToken = searchParams.get('token');
    const inviteOrgName = searchParams.get('orgName');

    // Clean up URL if there are other query parameters
    if (typeof window !== 'undefined' && searchParams.toString() && !inviteOrgId) {
        window.history.replaceState({}, '', '/signup');
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
                        M
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                        {inviteOrgId ? 'Join your team' : 'Create your account'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        {inviteOrgId ? 'Accept invite and collaborate.' : 'Start your 14-day free trial today.'}
                    </p>
                </div>
                <SignupForm
                    inviteOrgId={inviteOrgId || undefined}
                    inviteToken={inviteToken || undefined}
                    inviteOrgName={inviteOrgName || undefined}
                />
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignupContent />
        </Suspense>
    );
}
