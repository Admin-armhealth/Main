
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function deploy() {
    console.log("🚀 Deploying Migration: Policy Engine Schema...");

    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

    if (!connectionString) {
        console.error("❌ No DATABASE_URL or DIRECT_URL found in .env.local");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    try {
        await client.connect();
        console.log("✅ Connected to Database.");

        // Read Migration File
        const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260107_policy_engine_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        // Split by statement if needed, or just run whole block. 
        // pg client run query usually handles multiple statements but some drivers don't.
        // Let's try running as one block.
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
