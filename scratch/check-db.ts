import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { createAdminClient } from '../src/lib/supabase/server';

async function check() {
  const supabase = await createAdminClient();
  console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  // Try querying profiles
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(5);
  console.log('PROFILES QUERY RESULT:', { profiles, pError });

  // Try querying organizations
  const { data: orgs, error: oError } = await supabase.from('organizations').select('*').limit(5);
  console.log('ORGANIZATIONS QUERY RESULT:', { orgs, oError });

  // Try querying members
  const { data: members, error: mError } = await supabase.from('memberships').select('*').limit(5);
  console.log('MEMBERSHIPS QUERY RESULT:', { members, mError });
}

check().catch(console.error);
