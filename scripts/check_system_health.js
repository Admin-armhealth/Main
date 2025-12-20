
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHealth() {
    console.log('🏥 System Health Check');
    console.log('---------------------');

    // 1. Check Connection / Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.log('❌ Auth Service: FAILED', authError.message);
    } else {
        console.log('✅ Auth Service: OK');
    }

    // 2. Check Requests Table (History)
    const { data: reqData, error: reqError } = await supabase
        .from('requests')
        .select('count', { count: 'exact', head: true });

    if (reqError) {
        console.log('❌ Requests Table: FAILED (Table likely missing)', reqError.message);
        console.log('   -> Action: Run migration 20241217_requests_schema.sql');
    } else {
        console.log('✅ Requests Table: OK');
    }

    // 3. Check ICD10 Table
    const { data: icdData, error: icdError } = await supabase
        .from('icd10_codes')
        .select('count', { count: 'exact', head: true });

    if (icdError) {
        console.log('❌ ICD-10 Search: FAILED', icdError.message);
    } else {
        console.log('✅ ICD-10 Search: OK');
    }
}

checkHealth();
