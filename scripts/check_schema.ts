
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking Schema...');

    // Check organizations columns
    const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .limit(1);

    if (orgError) {
        console.error('Error querying organizations:', orgError);
    } else {
        console.log('Organizations columns (from sample):', orgData && orgData[0] ? Object.keys(orgData[0]) : 'No rows found, cannot infer columns');
    }

    // Check user_profiles columns via information_schema (since table is empty)
    const { data: columns, error: colError } = await supabase.rpc('get_columns', { table_name: 'user_profiles' });

    // Fallback if RPC fails (it likely defaults to nothing if not defined), use direct raw query if possible or just infer from error.
    // Actually, client cannot query information_schema directly with supabase-js unless exposed.
    // We will try to insert a dummy row to see if it fails? No, that's dangerous.
    // We will assume standard columns but try to select specific columns 'id, npi, full_name' and see if it errors.

    const { error: selectError } = await supabase
        .from('user_profiles')
        .select('id, npi, full_name')
        .limit(1);

    if (selectError) {
        console.log('user_profiles SELECT specific columns error:', selectError.message);
    } else {
        console.log('user_profiles has id, npi, full_name columns (Verified via Select)');
    }
}

checkSchema();

