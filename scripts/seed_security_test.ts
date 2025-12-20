import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env tables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

async function seed() {
    console.log('🌱 Seeding Security Test Fixtures...');

    // 1. Create Orgs
    const { error: orgError } = await supabase.from('organizations').upsert([
        { id: ORG_A, name: 'Clinic A (Good guys)' },
        { id: ORG_B, name: 'Clinic B (Victims)' }
    ]);
    if (orgError) console.error('Org Error:', orgError);

    // 2. Create Users (We can't satisfy FK into auth.users easily without real auth, 
    // BUT since we are using header-based mocking in the API logic that checks 'organization_members',
    // we strictly need the members table to have these IDs. 
    // *CRITICAL*: The 'organization_members' table has a FK to 'auth.users'. 
    // This script will FAIL if those users don't exist in auth.users.

    // To bypass this for TESTING ONLY, we might need to remove the FK constraint or
    // actually create the users in Gotrue. Or, simpler:
    // We assume the user has run the migration.
    // Let's checks if we can insert into organization_members. If it fails on FK, 
    // we will have to instruct the user or use a stub.

    // Actually, for a *local* Supabase test, we can typically insert into auth.users via SQL/Service Role 
    // if we really need to. Let's try to just insert MEMBERS and see if it explodes.
    // If auth.users FK enforces it, we need to create them.

    // HACK: For this specific test environment, if we can't create auth users easily via API,
    // we will assume the API logic checks `organization_members` which enforces the FK.
    // We will try to create the users in `auth.users` using the service role API.

    const { data: userACreated, error: uaErr } = await supabase.auth.admin.createUser({
        email: 'user_a@test.com',
        user_metadata: { name: 'User A' },
        email_confirm: true
        // We can't Force Update the ID to be our constant via this API usually.
        // We will have to update our CONSTANTS in the test suite to match the REAL IDs we get back.
        // OR we try to INSERT directly into auth.users via RPC or raw SQL if enabled.
    });

    // WAIT! Directly inserting into `organization_members` requires `user_id` to exist in `auth.users`.
    // Since we want deterministic tests, let's use a workaround: 
    // We'll update the STRESS TEST SUITE to use the IDs we generate here.
    // But that requires writing files dynamically.

    // BETTER PLAN: Just trying to insert. If it fails, I'll ask the user to run a SQL command 
    // to create the dummy users, which is cleaner.

    // Let's try to insert members.
    console.log('Attempting to seed members...');
    const { error: memberError } = await supabase.from('organization_members').upsert([
        { organization_id: ORG_A, user_id: USER_A, role: 'member' },
        { organization_id: ORG_B, user_id: USER_B, role: 'owner' }
    ]);

    if (memberError) {
        console.error('❌ Member Seed Failed (Likely FK constraint):', memberError.message);
        console.log('\n💡 FIX: Please run this SQL in Supabase SQL Editor to create dummy users:');
        console.log(`
        insert into auth.users (id, email) values 
        ('${USER_A}', 'user_a@test.com'),
        ('${USER_B}', 'user_b@test.com')
        on conflict (id) do nothing;
        `);
    } else {
        console.log('✅ Members Seeded Successfully!');
    }
}

seed();
