
import { NextResponse } from 'next/server';
import { PolicyEngine } from '@/lib/policyEngine';

export async function POST(req: Request) {
    try {
        const { note, cptCode } = await req.json();

        if (!note || !cptCode) {
            return NextResponse.json({ success: false, error: "Missing note or CPT code" }, { status: 400 });
        }

        // Use the new Deterministic Engine
        const result = await PolicyEngine.verify(cptCode, note);

        return NextResponse.json({
            success: true,
            overall_status: result.overall_status,
            analysis: result.analysis,
            missing_info: result.missing_info
        });

    } catch (error: any) {
        console.error("Prediction API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
