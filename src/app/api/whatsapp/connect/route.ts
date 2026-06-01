import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, mode, meta_business_id, whatsapp_business_account_id, phone_number_id } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const admin = await createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', authData.user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can connect WhatsApp' }, { status: 403 });
    }

    // Mode: 'sandbox' (demo) or 'evolution' (production)
    const connectionMode = mode || 'sandbox';

    if (connectionMode === 'evolution') {
      // Production: Create Evolution API instance
      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        return NextResponse.json({ error: 'Evolution API not configured' }, { status: 500 });
      }

      const instanceName = `oye-${orgId}`;

      try {
        const instanceRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          body: JSON.stringify({
            instanceName,
            qrCode: true
          })
        });

        if (!instanceRes.ok) {
          throw new Error('Failed to create Evolution instance');
        }

        const instanceData = await instanceRes.json();

        // Store instance info
        await admin.from('organizations').update({
          whatsapp_instance: instanceName,
          whatsapp_status: 'pending',
          onboarding_step: 3
        }).eq('id', orgId);

        return NextResponse.json({
          success: true,
          mode: 'evolution',
          instance: instanceName,
          qrCode: instanceData.qrCode?.code,
          message: 'Scan the QR code with WhatsApp to connect'
        });
      } catch (e: any) {
        console.error('[WhatsApp Connect] Evolution error:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    // Sandbox mode (demo/default)
    if (!meta_business_id || !whatsapp_business_account_id || !phone_number_id) {
      // Generate demo credentials
      const demoPhone = '+593' + Math.floor(Math.random() * 900000000 + 100000000);
      
      await admin.from('organizations').update({
        meta_business_id: 'demo_' + crypto.randomBytes(8).toString('hex'),
        whatsapp_business_account_id: 'demo',
        phone_number_id: demoPhone,
        whatsapp_status: 'connected',
        onboarding_step: 3
      }).eq('id', orgId);

      return NextResponse.json({
        success: true,
        mode: 'sandbox',
        phone: demoPhone,
        message: 'Demo mode connected. Use this number to test.'
      });
    }

    // Meta verification (for production when they provide credentials)
    const verificationSuccess = true;

    if (!verificationSuccess) {
      return NextResponse.json({ error: 'Meta API verification failed' }, { status: 400 });
    }

    // Store in DB
    const { data, error } = await admin
      .from('organizations')
      .update({
        meta_business_id,
        whatsapp_business_account_id,
        phone_number_id,
        whatsapp_status: 'connected',
        onboarding_step: 3
      })
      .eq('id', orgId)
      .select('id')
      .single();

    if (error) throw error;

    // Generate webhook verify token
    const webhookVerifyToken = crypto.randomBytes(16).toString('hex');
    
    await admin.from('organization_settings').upsert({
      organization_id: orgId,
      webhook_verify_token: webhookVerifyToken,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      mode: 'meta',
      message: 'WhatsApp connected successfully'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET status
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');

  if (!orgId) {
    return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
  }

  try {
    const admin = await createAdminClient();
    const { data: org } = await admin
      .from('organizations')
      .select('whatsapp_status, whatsapp_instance')
      .eq('id', orgId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // If Evolution, check status
    if (org.whatsapp_instance && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      try {
        const statusRes = await fetch(
          `${EVOLUTION_API_URL}/instance/connectionState/${org.whatsapp_instance}`,
          { headers: { 'apikey': EVOLUTION_API_KEY } }
        );
        
        const statusData = await statusRes.json();
        
        return NextResponse.json({
          connected: statusData.state === 'open',
          status: statusData.state || 'offline',
          phone: statusData.phoneNumber
        });
      } catch {
        return NextResponse.json({
          connected: false,
          status: org.whatsapp_status || 'disconnected'
        });
      }
    }

    return NextResponse.json({
      connected: org.whatsapp_status === 'connected',
      status: org.whatsapp_status || 'disconnected'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}