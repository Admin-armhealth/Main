
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log("Available Env Keys:", Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC') || k.includes('SUPABASE') || k.includes('URL')));
