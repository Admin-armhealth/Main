'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { supabase } from '@/lib/supabaseClient';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';

    // Check authentication and Organization on protected routes
    useEffect(() => {
        if (isAuthPage) {
            setIsChecking(false);
            return;
        }

        const checkAuthAndOrg = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // Check if user has an org
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('organization_id')
                .eq('id', session.user.id)
                .single();

            if (!profile?.organization_id) {
                // User has no org (Self-Healing)
                console.log("No organization found. Creating default...");
                try {
                    const res = await fetch('/api/org/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}` // Pass token for RLS bypass if needed or just context
                        },
                        body: JSON.stringify({
                            name: 'My Clinic', // Default Name
                            userId: session.user.id
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        console.log("Auto-created Org:", data);
                        // Force a reload to refresh cookies/middleware context
                        window.location.reload();
                        return;
                    }
                } catch (e) {
                    console.error("Failed to auto-create org:", e);
                }
            }

            setIsChecking(false);
        };

        checkAuthAndOrg();
    }, [pathname, router, isAuthPage]);

    if (isAuthPage) {
        return (
            <main className="min-h-screen bg-slate-50">
                {children}
            </main>
        );
    }

    // Show loading while checking auth on protected routes
    if (isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 lg:ml-64 p-8">
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
