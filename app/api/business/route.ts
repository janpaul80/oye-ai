import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://oye_whatsapp_api:3005';

export async function GET() {
  try {
    const response = await fetch(`${WHATSAPP_API}/api/business`);
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'Failed to fetch business' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Business GET] Error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${WHATSAPP_API}/api/business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'Failed to save business' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Business POST] Error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}