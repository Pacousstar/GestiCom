import { NextResponse } from 'next/server'

export async function GET() {
    return NextResponse.json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        env: process.env.NODE_ENV,
        db_configured: !!process.env.DATABASE_URL
    })
}
