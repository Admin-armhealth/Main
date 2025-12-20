
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Try Full Text Search first (if websearch_to_tsquery is available/supported by schema)
        // Schema: search_text tsvector
        // We use .textSearch on the 'search_text' column.

        let { data, error } = await supabase
            .from('icd10_codes')
            .select('code, description')
            .textSearch('search_text', `${query}:*`, { // Prefix matching
                type: 'websearch',
                config: 'english'
            })
            .limit(20);

        // Fallback: If FTS returns nothing or if we just want simple prefix match on code
        // sometimes FTS is too strict for partial codes like "M23"
        // Let's try an OR condition if FTS yields low results? 
        // Or better: parallel query? For MVP, I'll stick to textSearch or ILIKE.

        // Actually, for codes "M23", ILIKE is better. For "Meniscus", FTS is better.
        // Let's try pure ILIKE on code OR description if FTS is empty or just use OR query.

        if (!data || data.length === 0) {
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('icd10_codes')
                .select('code, description')
                .or(`code.ilike.${query}%,description.ilike.%${query}%`)
                .limit(20);

            if (fallbackData) data = fallbackData;
        }

        if (error) throw error;

        return NextResponse.json({ results: data || [] });
    } catch (error) {
        console.error('ICD Search Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
