import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://oye_whatsapp_api:3005';

export async function GET(request: NextRequest) {
  try {
    // Fetch leads and messages from WhatsApp API
    const [leadsRes, messagesRes] = await Promise.all([
      fetch(`${WHATSAPP_API}/api/leads`),
      fetch(`${WHATSAPP_API}/api/appointments`),
    ]);
    
    const leads = leadsRes.ok ? await leadsRes.json() : [];
    const appointments = messagesRes.ok ? await messagesRes.json() : [];
    
    // Calculate stats
    const totalLeads = leads.length;
    const newToday = leads.filter((l: { created_at: string }) => {
      const created = new Date(l.created_at);
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length;
    
    const qualified = leads.filter((l: { score: number }) => l.score >= 70).length;
    
    return NextResponse.json({
      totalLeads,
      newToday,
      qualified,
      conversations: leads.length,
      messages: 0,
      appointments: appointments.length,
      lastActivity: leads[0]?.last_message_at || null,
    });
  } catch (error) {
    console.error('[Inbox Stats] Error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}