import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://oye-whatsapp-api:3005';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const decodedPhone = decodeURIComponent(phone);
    
    const response = await fetch(`${WHATSAPP_API}/api/messages/${decodedPhone}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: response.status });
    }
    
    const messages = await response.json();
    return NextResponse.json(messages);
  } catch (error) {
    console.error('[Inbox Messages] Error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}