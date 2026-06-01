import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: appointmentId } = await params;
    const body = await request.json();
    const { orgId, newStartTime, newEndTime, reason } = body;

    if (!orgId || !appointmentId) {
      return NextResponse.json({ error: 'Missing orgId or appointmentId' }, { status: 400 });
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

    const updateData: Record<string, any> = { status: 'pending', updated_at: new Date().toISOString() };
    if (newStartTime) updateData.start_time = newStartTime;
    if (newEndTime) updateData.end_time = newEndTime;

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

    await admin.from('conversation_events').insert({
      organization_id: orgId,
      conversation_id: appointment.conversation_id,
      event_type: 'appointment_rescheduled',
      payload: {
        user_id: user.id,
        appointment_id: appointmentId,
        new_start_time: newStartTime,
        new_end_time: newEndTime,
        reason: reason || null
      }
    });

    return NextResponse.json({ success: true, appointment });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}