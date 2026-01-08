
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function deploy() {
    console.log("🚀 Deploying Migration: Restore Requests...");

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
        const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260108_restore_requests.sql');
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
