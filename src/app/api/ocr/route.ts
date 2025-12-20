import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return NextResponse.json(
        { error: 'Server-side OCR is disabled. Please use client-side processing.' },
        { status: 501 }
    );
}
