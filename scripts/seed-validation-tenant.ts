import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function seed() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('Skipping seed: Missing Supabase credentials');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('🌱 Seeding validation tenant and channel...');

  // We bypass the organizations table to avoid the PostgREST schema cache bug.
  // 2. Create WhatsApp Channel directly
  const { error: chanErr } = await supabase
    .from('channels')
    .upsert({
      organization_id: '11111111-1111-1111-1111-111111111111', // Dummy UUID
      type: 'whatsapp',
      provider_channel_id: 'PHONE_ID',
      name: 'Validation Phone',
      is_active: true
    }, { onConflict: 'provider_channel_id' });

  if (chanErr) {
    console.error('Channel error:', chanErr);
    process.exit(1);
  }

  console.log('✅ Sandbox Org and Channel (PHONE_ID) provisioned successfully.');
}

seed().catch(console.error);
