
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyInvites() {
    console.log('Verifying Invites Table...');

    // 1. Check if we can select from invites (Service Role should be able to)
    const { data: invites, error: selectError } = await supabase
        .from('invites')
        .select('*')
        .limit(5);

    if (selectError) {
        console.error('Error selecting invites:', selectError);
    } else {
        console.log(`Found ${invites?.length} invites in the table.`);
        console.log('Recent invite:', invites?.[0]);
    }

    // 2. Simulate API Logic (Insert)
    // We need a valid Organization ID first
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
    if (!org) {
        console.error('No organization found to test invite.');
        return;
    }

    console.log('Testing Invite Creation for Org:', org.id);

    // Create a dummy invite
    const testEmail = `test_invite_${Date.now()}@example.com`;
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: inserted, error: insertError } = await supabase
        .from('invites')
        .insert({
            organization_id: org.id,
            email: testEmail,
            role: 'member',
            token: token,
            expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert Logic Failed:', insertError);
    } else {
        console.log('✅ Insert Logic Passed. Created ID:', inserted.id);

        // Clean up
        await supabase.from('invites').delete().eq('id', inserted.id);
        console.log('Cleaned up test invite.');
    }
}

verifyInvites();
