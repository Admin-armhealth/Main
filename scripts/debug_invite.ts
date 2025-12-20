
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkInvite() {
    // specific token or just get the latest one
    const { data: invite, error } = await supabase
        .from('invites')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Invite Data:', JSON.stringify(invite, null, 2));
    }
}

checkInvite();
