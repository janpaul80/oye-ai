import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://oye_whatsapp_api:3005';

export async function GET() {
  try {
    const response = await fetch(`${WHATSAPP_API}/api/appointments`);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: response.status });
    }
    const appointments = await response.json();
    // Transform to simpler format
    return NextResponse.json(appointments.map((apt: any) => ({
      id: apt.id,
      phone: apt.customer?.phone || apt.phone,
      date: apt.start_time ? new Date(apt.start_time).toISOString().split('T')[0] : '',
      time: apt.start_time ? new Date(apt.start_time).toTimeString().slice(0,5) : '',
      status: apt.status,
      service: apt.notes,
      created_at: apt.created_at,
    })));
  } catch (error) {
    console.error('[Appointments] Error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, date, time, service } = body;
    
    if (!phone || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Convert to appointment format
    const start_time = new Date(`${date}T${time}:00`).toISOString();
    const end_time = new Date(new Date(`${date}T${time}:00`).getTime() + 3600000).toISOString();
    
    const response = await fetch(`${WHATSAPP_API}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, start_time, end_time, notes: service }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'Failed to create appointment', details: error }, { status: response.status });
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Appointments] Error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}