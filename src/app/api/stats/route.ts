import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // API route shouldn't set cookies usually, but required for type signature
                },
                remove(name: string, options: CookieOptions) {
                    // API route shouldn't set cookies usually, but required for type signature
                },
            },
        }
    );

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch logs for this user (RLS will filter by Org automatically if set up correctly, 
        // but let's assume we query for the user_id or rely on RLS)
        // Check my RLS: "Users can read own logs".

        // 3a. Fetch Recent Activity (Requests table)
        // We wrap in try/catch in case the migration hasn't run yet to prevent crashing the whole dashboard.
        let recentRequests: any[] = [];
        try {
            const { data: requests, error: reqError } = await supabase
                .from('requests')
                .select('id, title, request_type, status, created_at, output_data')
                .order('created_at', { ascending: false })
                .limit(5);

            if (!reqError && requests) {
                recentRequests = requests;
            }
        } catch (err: any) {
            console.warn("Requests table not ready yet:", err.message);
        }

        // 3b. Fetch Policy Alerts (New Feature)
        let recentAlerts: any[] = [];
        try {
            const { data: alerts, error: alertError } = await supabase
                .from('policy_changes')
                .select('*, policies(title, payer)')
                .order('detected_at', { ascending: false })
                .limit(3);

            if (!alertError && alerts) {
                recentAlerts = alerts;
            }
        } catch (err: any) {
            console.warn("Policy Changes table not ready yet:", err.message);
        }

        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('action_type', 'GENERATE_PREAUTH') // Only count value-generating actions
            .order('created_at', { ascending: false });

        if (error) throw error;

        // CALCULATE METRICS
        const totalAuths = logs.length;

        // ROI Constants
        const MANUAL_COST = 15.00; // $15 per auth
        const AI_COST = 1.50;      // $1.50 per auth
        const SAVINGS_PER_AUTH = MANUAL_COST - AI_COST;
        const TIME_SAVED_MINUTES = 18; // 20 - 2

        const totalSavedMoney = totalAuths * SAVINGS_PER_AUTH;
        const totalSavedTimeHours = (totalAuths * TIME_SAVED_MINUTES) / 60;

        // Quality Trends
        let totalScore = 0;
        let scoredCount = 0;

        // Top Payers Map
        const payerCounts: Record<string, number> = {};

        logs.forEach(log => {
            const meta = log.metadata || {};

            // Quality
            if (meta.qualityScore) {
                totalScore += Number(meta.qualityScore);
                scoredCount++;
            }

            // Payer
            if (meta.payer) {
                payerCounts[meta.payer] = (payerCounts[meta.payer] || 0) + 1;
            }
        });

        const avgQuality = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : 0;

        // Convert Payer Stats to Array
        const topPayers = Object.entries(payerCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return NextResponse.json({
            stats: {
                totalAuths,
                totalSavedMoney,
                totalSavedTimeHours,
                avgQuality,
                topPayers,
                recentRequests,
                recentAlerts
            }
        });

    } catch (e: any) {
        console.error('Stats Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
