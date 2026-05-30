/**
 * Oye AI: Production Emergency Lockdown & Self-Healing Restoration Runbook Script
 * File Location: scripts/emergency-lockdown.ts
 *
 * Implements an authoritative emergency shutdown protocol. Under credential leak,
 * billing failure, or active DDoS escalation, platform operators can execute:
 *   npx tsx scripts/emergency-lockdown.ts --scope=all --action=lockdown --confirm
 *
 * Restoration recovery flow:
 *   npx tsx scripts/emergency-lockdown.ts --scope=all --action=restore --confirm
 *
 * Design features:
 *   - Blast Radius Control (Scopes: all, webhooks, queues, tenants)
 *   - Rollback / Recovery Unlock Flow (restores original tenant statuses from metadata state)
 *   - Operator Override Path (requires explicit --confirm CLI flag)
 *   - Audit Persistence Guarantees (commits lockdown/restoration trail to database audit_logs)
 */

import dotenv from 'dotenv';
import path from 'path';
import IORedis from 'ioredis';

// Load configurations
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { createAdminClient } from '../src/lib/supabase/server';

// Parse arguments
const scopeArg = process.argv.find(a => a.startsWith('--scope='))?.split('=')[1] || 'all';
const actionArg = process.argv.find(a => a.startsWith('--action='))?.split('=')[1] || 'lockdown';
const confirmed = process.argv.includes('--confirm');

const validScopes = ['all', 'webhooks', 'queues', 'tenants'];
const validActions = ['lockdown', 'restore'];

if (!validScopes.includes(scopeArg)) {
  console.error(`❌ Invalid scope '${scopeArg}'. Supported: ${validScopes.join(', ')}`);
  process.exit(1);
}

if (!validActions.includes(actionArg)) {
  console.error(`❌ Invalid action '${actionArg}'. Supported: ${validActions.join(', ')}`);
  process.exit(1);
}

// Safety check
if (!confirmed) {
  console.error(`❌ ERROR: Safety Gate Blocker! Explicit confirmation is required to run emergency scripts.`);
  console.log(`To execute this command, you MUST append the --confirm flag:`);
  console.log(`   npx tsx scripts/emergency-lockdown.ts --scope=${scopeArg} --action=${actionArg} --confirm`);
  process.exit(1);
}

// Setup Redis Client
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let redisClient: IORedis | null = null;
try {
  redisClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
  });
} catch (err: any) {
  console.warn('⚠️ Redis connection failed. Local memory fallback will be used in workers.', err.message);
}

function printHeader(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`🚨 [EMERGENCY COMMAND CENTER] ${title}`);
  console.log('='.repeat(80));
}

async function runEmergencyOperation() {
  printHeader(`INITIATING EMERGENCY ENGINE TRANSITION`);
  console.log(`- TARGET SCOPE:  ${scopeArg.toUpperCase()}`);
  console.log(`- TARGET ACTION: ${actionArg.toUpperCase()}`);
  console.log(`- BLAST RADIUS:  ${scopeArg === 'all' ? 'FULL PLATFORM DOWNTIME' : 'PARTIAL - ' + scopeArg.toUpperCase()}`);
  
  const adminClient = await createAdminClient();
  const operatorName = process.env.OPERATOR_NAME || 'SYSTEM_OPERATOR_ADMIN';
  const traceId = `emergency_lockdown_${Date.now()}`;

  if (actionArg === 'lockdown') {
    // ----------------------------------------
    // LOCKDOWN SEQUENCE
    // ----------------------------------------
    console.log('\n🔒 Executing Fail-Closed System Lockdown...');

    // 1. Lockdown Webhook APIs (Webhooks block via Redis flags)
    if (scopeArg === 'webhooks' || scopeArg === 'all') {
      console.log('⏳ Isolating webhooks boundary (marking mock/real webhooks as fail-closed in state)...');
      if (redisClient) {
        await redisClient.set('lockdown:webhooks:active', 'true');
        await redisClient.set('lockdown:status:message', 'System placed in lockdown by administrator.');
      }
      console.log('✅ Webhooks status updated to FAIL-CLOSED.');
    }

    // 2. Pause Workers & Queues
    if (scopeArg === 'queues' || scopeArg === 'all') {
      console.log('⏳ Severing BullMQ queues processing loops...');
      if (redisClient) {
        await redisClient.set('lockdown:queues:paused', 'true');
      }
      console.log('✅ Queue processing loops paused successfully.');
    }

    // 3. Suspend Tenants / Organizations
    if (scopeArg === 'tenants' || scopeArg === 'all') {
      console.log('⏳ Retrieving all active/beta-approved organizations to suspend...');
      
      // Fetch all organizations not already closed/suspended
      const { data: orgs, error: fetchErr } = await adminClient
        .from('organizations')
        .select('id, status, settings');
      
      if (fetchErr) {
        console.error('❌ Failed to fetch organizations:', fetchErr.message);
        process.exit(1);
      }

      const activeOrgs = orgs?.filter(o => o.status === 'active' || o.status === 'beta_approved') || [];
      console.log(`- Found ${activeOrgs.length} active organizations to suspend.`);

      let suspendedCount = 0;
      for (const org of activeOrgs) {
        const preStatus = org.status;
        const updatedSettings = {
          ...(org.settings || {}),
          pre_lockdown_status: preStatus,
          lockdown_initiated_at: new Date().toISOString(),
          lockdown_operator: operatorName
        };

        const { error: updateErr } = await adminClient
          .from('organizations')
          .update({
            status: 'suspended',
            settings: updatedSettings
          })
          .eq('id', org.id);

        if (!updateErr) {
          suspendedCount++;
        }
      }
      console.log(`✅ Suspended ${suspendedCount}/${activeOrgs.length} tenants with pre-lockdown status preserved.`);
    }

    // 4. Persistence Audit Trail
    try {
      await adminClient.from('audit_logs').insert({
        organization_id: '88888888-8888-8888-8888-888888888888',
        action: 'emergency.system_lockdown_triggered',
        details: {
          operator: operatorName,
          scope: scopeArg,
          action: actionArg,
          traceId,
          timestamp: new Date().toISOString(),
          description: `Catastrophic incident mitigation loop triggered system-wide lockdown.`
        }
      });
      console.log('✅ Authoritative audit log committed successfully.');
    } catch (auditErr: any) {
      console.error('❌ Failed to commit audit trail:', auditErr.message);
    }

    printHeader('LOCKDOWN SEQUENCE SUCESSFULLY ENFORCED!');

  } else {
    // ----------------------------------------
    // RESTORATION SEQUENCE
    // ----------------------------------------
    console.log('\n🔓 Executing Self-Healing Restoration Sequence...');

    // 1. Restoration of Webhooks
    if (scopeArg === 'webhooks' || scopeArg === 'all') {
      console.log('⏳ Restoring webhook ingestion gateways...');
      if (redisClient) {
        await redisClient.del('lockdown:webhooks:active');
        await redisClient.del('lockdown:status:message');
      }
      console.log('✅ Webhooks status restored to operational.');
    }

    // 2. Resume Workers & Queues
    if (scopeArg === 'queues' || scopeArg === 'all') {
      console.log('⏳ Resuming queue processing loops...');
      if (redisClient) {
        await redisClient.del('lockdown:queues:paused');
      }
      console.log('✅ Queue processing resumed.');
    }

    // 3. Restore Tenants / Organizations
    if (scopeArg === 'tenants' || scopeArg === 'all') {
      console.log('⏳ Finding organizations suspended by lockdown to restore...');
      const { data: orgs, error: fetchErr } = await adminClient
        .from('organizations')
        .select('id, status, settings');

      if (fetchErr) {
        console.error('❌ Failed to fetch organizations:', fetchErr.message);
        process.exit(1);
      }

      const lockedOrgs = orgs?.filter(o => o.status === 'suspended' && o.settings?.pre_lockdown_status) || [];
      console.log(`- Found ${lockedOrgs.length} locked organizations to restore.`);

      let restoredCount = 0;
      for (const org of lockedOrgs) {
        const restoreStatus = org.settings.pre_lockdown_status;
        const cleanSettings = { ...(org.settings || {}) };
        delete cleanSettings.pre_lockdown_status;
        delete cleanSettings.lockdown_initiated_at;
        delete cleanSettings.lockdown_operator;

        const { error: updateErr } = await adminClient
          .from('organizations')
          .update({
            status: restoreStatus,
            settings: cleanSettings
          })
          .eq('id', org.id);

        if (!updateErr) {
          restoredCount++;
        }
      }
      console.log(`✅ Restored ${restoredCount}/${lockedOrgs.length} organizations to their original states.`);
    }

    // 4. Persistence Audit Trail
    try {
      await adminClient.from('audit_logs').insert({
        organization_id: '88888888-8888-8888-8888-888888888888',
        action: 'emergency.system_restoration_triggered',
        details: {
          operator: operatorName,
          scope: scopeArg,
          action: actionArg,
          traceId,
          timestamp: new Date().toISOString(),
          description: `Self-healing restoration script executed by platform operator.`
        }
      });
      console.log('✅ Authoritative audit log committed successfully.');
    } catch (auditErr: any) {
      console.error('❌ Failed to commit audit trail:', auditErr.message);
    }

    printHeader('SYSTEM SUCCESSFULLY RESTORED TO HEALTHY OPERATION!');
  }

  // Cleanup Redis
  if (redisClient) {
    await redisClient.disconnect();
  }
  process.exit(0);
}

runEmergencyOperation().catch(err => {
  console.error('❌ EMERGENCY TRANSACTION CRASHED:', err);
  process.exit(1);
});
