import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://oye_whatsapp_api:3005';

export async function GET(request: NextRequest) {
  try {
    // Proxy to WhatsApp API
    const response = await fetch(`${WHATSAPP_API}/api/leads`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: response.status });
    }
    
    const leads = await response.json();
    return NextResponse.json(leads);
  } catch (error) {
    console.error('[Inbox Leads] Error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}