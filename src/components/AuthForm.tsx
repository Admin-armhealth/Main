'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthForm() {
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                try {
                    // Fetch user's org to set cookie immediately
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('organization_id')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (profile?.organization_id) {
                        await fetch('/api/org/select', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orgId: profile.organization_id })
                        });
                    }
                } catch (e) {
                    console.error("Failed to sync org cookie", e);
                }

                router.refresh();
                router.push('/dashboard');
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    return (
        <div className="max-w-md w-full mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold mb-4 text-center text-slate-800">Welcome to ARM</h2>
            <Auth
                supabaseClient={supabase}
                appearance={{
                    theme: ThemeSupa,
                    variables: {
                        default: {
                            colors: {
                                brand: '#2563eb', // Blue 600
                                brandAccent: '#1d4ed8', // Blue 700
                            },
                        },
                    },
                }}
                providers={[]} // Email/Password only for MVP
            />
        </div>
    );
}
