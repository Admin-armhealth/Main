
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function deploy() {
    console.log("🚀 Deploying Migration: Structured Rules (V1 Policy Engine)...");


    // Debug: Print available keys (security safe)
    console.log("Environment Keys:", Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('Path')));

    let connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

    // Fallback for Local Supabase Default
    if (!connectionString) {
        console.warn("⚠️ No DATABASE_URL found. Attempting default Local Supabase credentials...");
        connectionString = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    }

    const client = new Client({
        connectionString,
        ssl: false // Local usually no SSL, or rejectUnauthorized: false if needed
    });


    try {
        await client.connect();
        console.log("✅ Connected to Database.");

        // Read Migration File
        const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260109_structured_rules.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        console.log(`📄 Executing SQL from ${path.basename(migrationPath)}...`);

        await client.query(sql);

        console.log("✅ Migration applied successfully!");

    } catch (err: any) {
        console.error("❌ Migration Failed:", err.message);
        if (err.position) console.error(`   at position ${err.position}`);
    } finally {
        await client.end();
    }
}

deploy();
