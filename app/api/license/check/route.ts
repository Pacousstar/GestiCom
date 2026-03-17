import { NextResponse } from 'next/server'

export async function GET() {
    return NextResponse.json({ 
        activated: true, 
        hwid: 'GESTICOM-PRO-MASTER',
        message: "SYSTÈME ACTIVÉ" 
    })
}
