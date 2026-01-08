
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function deploy() {
    console.log("🚀 Deploying Migration: Policy Change Alerts...");

    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

    if (!connectionString) {
        console.error("❌ No DATABASE_URL found in .env.local");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    try {
        await client.connect();

        const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260108_policy_change_alerts.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("📝 Executing SQL...");
        await client.query(sql);

        console.log("✅ Migration applied successfully!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

deploy();
