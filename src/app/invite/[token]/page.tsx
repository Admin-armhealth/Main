import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function InvitePage({ params }: { params: { token: string } }) {
    const { token } = await params;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Verify Token
    const { data: invite, error } = await supabase
        .from('invites')
        .select('*, organizations(name)')
        .eq('token', token)
        .single();

    if (error || !invite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-md text-center">
                    <h1 className="text-xl font-bold text-red-600 mb-2">Invalid or Expired Invite</h1>
                    <p className="text-slate-600 mb-6">This invitation link is invalid or has expired.</p>
                    <Link href="/" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-md text-center">
                    <h1 className="text-xl font-bold text-red-600 mb-2">Invitation Expired</h1>
                    <p className="text-slate-600 mb-6">This invitation has expired.</p>
                    <Link href="/" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    // 2. Redirect to Signup/Login with context
    // Handle potential array or object return from join
    const orgData: any = invite.organizations;
    const orgName = Array.isArray(orgData)
        ? (orgData[0]?.name || 'Organization')
        : (orgData?.name || 'Organization');

    // CONSTRUCT DESTINATION
    const destination = `/signup?org=${invite.organization_id}&orgName=${encodeURIComponent(orgName)}&email=${encodeURIComponent(invite.email)}&token=${token}`;

    // FORCE LOGOUT FIRST (To prevent "Admin Session Leak")
    // We redirect to our signout route, which will then redirect to the signup page
    redirect(`/api/auth/signout?next=${encodeURIComponent(destination)}`);
}
