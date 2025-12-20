
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

// --- Env Setup ---
const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split(/\r?\n/).forEach(line => {
        const [key, ...rest] = line.split('=');
        const val = rest.join('=');
        if (key && val) {
            const cleanKey = key.trim();
            const cleanVal = val.trim().replace(/^["']|["']$/g, '');
            if (cleanKey === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = cleanVal;
            if (cleanKey === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = cleanVal;
        }
    });
}

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
});

// --- Parser Logic ---

const XML_PATH = path.join(process.cwd(), 'icd10cm-tabular-2026.xml');

async function seed() {
    if (!fs.existsSync(XML_PATH)) {
        console.error('❌ File not found:', XML_PATH);
        process.exit(1);
    }

    console.log('📖 Reading XML file...');
    const xmlData = fs.readFileSync(XML_PATH, 'utf-8');

    console.log('🧩 Parsing XML structure (this may take a moment)...');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const jsonObj = parser.parse(xmlData);

    const codes: { code: string; description: string }[] = [];

    // Helper to recursively finding <diag> elements
    function traverse(node: any) {
        if (!node) return;

        // If it's a diag node, add it
        if (node.name && node.desc) {
            // XML Parser often returns single child as object, multiple as array.
            // We need to be careful. In this XML: <name>A00</name> <desc>...</desc>
            // fast-xml-parser usually maps <name>A00</name> to { name: "A00" } or simply "A00" depending on config.
            // Let's debug specifically based on standard generic output.
            // Usually: node.name, node.desc are text values.

            // Check if it's a valid code (sometimes they are ranges or chapters, but <diag><name> usually is a code)
            codes.push({
                code: String(node.name),
                description: String(node.desc)
            });
        }

        // Recurse strictly on 'diag' children
        if (node.diag) {
            if (Array.isArray(node.diag)) {
                node.diag.forEach(traverse);
            } else {
                traverse(node.diag);
            }
        }
    }

    // Root is usually jsonObj['ICD10CM.tabular']
    const root = jsonObj['ICD10CM.tabular'];
    if (root && root.chapter) {
        const chapters = Array.isArray(root.chapter) ? root.chapter : [root.chapter];
        chapters.forEach((chapter: any) => {
            // Chapters have sections
            if (chapter.sectionIndex) {
                // sectionIndex is just a list, we want the actual 'section' tags maybe?
                // Looking at lines 141, <section id="A00-A09">... 
                // So we need to look for 'section'.
            }
            if (chapter.section) {
                const sections = Array.isArray(chapter.section) ? chapter.section : [chapter.section];
                sections.forEach((section: any) => {
                    // Sections have diags
                    if (section.diag) {
                        const diags = Array.isArray(section.diag) ? section.diag : [section.diag];
                        diags.forEach(traverse);
                    }
                });
            }
        });
    }

    console.log(`📦 Extracted ${codes.length} codes. Preparing to seed...`);

    // Batch Insert (Upsert)
    const batchSize = 1000;
    for (let i = 0; i < codes.length; i += batchSize) {
        const batch = codes.slice(i, i + batchSize);
        const { error } = await supabase.from('icd10_codes').upsert(batch, { onConflict: 'code' });
        if (error) {
            console.error(`❌ Error in batch ${i}:`, error.message);
        } else {
            if (i % 5000 === 0) console.log(`✅ ${i + batch.length} / ${codes.length} inserted...`);
        }
    }

    console.log('✨ 2026 Data Import Complete!');
}

seed();
