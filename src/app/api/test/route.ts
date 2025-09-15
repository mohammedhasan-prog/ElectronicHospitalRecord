// src/app/api/test/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    ok: true, 
    message: 'API routes are working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      ok: true, 
      message: 'POST request received',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      message: 'Error parsing JSON',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}