import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
type AppointmentStatus = typeof VALID_STATUSES[number];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: appointmentId } = await params;
    const { status, reason } = await request.json();
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId || !appointmentId) {
      return NextResponse.json({ error: 'Missing orgId or appointmentId' }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be pending, confirmed, or cancelled' }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, any> = { 
      status: status as AppointmentStatus,
      updated_at: new Date().toISOString()
    };

    const { data: appointment, error: updateErr } = await admin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .eq('organization_id', orgId)
      .select('*, customers(*), conversations(*)')
      .single();

    if (updateErr || !appointment) {
      return NextResponse.json({ error: updateErr?.message || 'Appointment not found' }, { status: 500 });
    }

    const eventType = status === 'confirmed' ? 'appointment_confirmed' : 
                   status === 'cancelled' ? 'appointment_cancelled' : 'appointment_updated';

    await admin.from('conversation_events').insert({
      organization_id: orgId,
      conversation_id: appointment.conversation_id,
      event_type: eventType,
      payload: {
        user_id: user.id,
        appointment_id: appointmentId,
        reason: reason || null
      }
    });

    return NextResponse.json({ success: true, appointment });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}