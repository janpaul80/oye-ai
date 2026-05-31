import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://oye_whatsapp_api:3005';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, note } = body;
    
    if (!phone || !note) {
      return NextResponse.json({ error: 'Missing phone or note' }, { status: 400 });
    }
    
    // Forward to WhatsApp API
    const response = await fetch(`${WHATSAPP_API}/api/leads/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, note }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'Failed to save note', details: error }, { status: response.status });
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Notes] Error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}