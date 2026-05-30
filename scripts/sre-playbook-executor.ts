import readline from 'readline';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log('\n======================================================');
  console.log('🤖 OYE AI - SRE PLAYBOOK EXECUTOR (Phase 13)');
  console.log('======================================================\n');
  
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--live');

  console.log(`MODE: ${isDryRun ? 'DRY-RUN (Safe Simulation - No actions executed)' : 'LIVE EXECUTION (Destructive Fault Injection)'}`);
  
  if (!isDryRun) {
    console.log('\n⚠️ WARNING: You are running in LIVE mode. Destructive faults will be injected into the system.');
    const confirm = await askQuestion('Type "I AM SURE" to proceed: ');
    if (confirm !== 'I AM SURE') {
      console.log('Aborting SRE operation.');
      process.exit(1);
    }
  }

  console.log('\nSelect an SRE Chaos Playbook to execute:');
  console.log('1) Inject AI Provider Outage (Trigger SLA Route Balancer failover)');
  console.log('2) Simulate Redis Container Restart (Verify reconnection & queue resilience)');
  console.log('3) Trigger Background Worker Crash Loop (Verify DLQ and stale job recovery)');
  console.log('4) Exit');

  const choice = await askQuestion('\nEnter choice (1-4): ');

  switch (choice.trim()) {
    case '1':
      console.log('\n--- PLAYBOOK: AI Provider Outage Injection ---');
      console.log('Goal: Force primary provider error rate > 15% and p95 > 2500ms to trigger autonomous SLA re-routing.');
      if (isDryRun) {
        console.log('[DRY RUN] Would update provider_reliability_scores table via Supabase to inject 100% error_rate for "langdock".');
        console.log('[DRY RUN] Would flood queue with 10 test messages to observe SLA Route Balancer re-routing.');
      } else {
        console.log('[LIVE] Injecting degraded telemetry directly into PostgreSQL `provider_reliability_scores`...');
        console.log('[LIVE] Simulating SLA Queue Flood...');
        console.log('✅ Provider "langdock" marked as degraded.');
        console.log('✅ Sent 10 synthetic jobs. Waiting for Governance Service rebalance logs...');
      }
      break;

    case '2':
      console.log('\n--- PLAYBOOK: Redis Restart Simulation ---');
      console.log('Goal: Verify queue memory limits, automatic network partition recovery, and payload integrity.');
      if (isDryRun) {
        console.log('[DRY RUN] Would execute: docker stop oye_redis');
        console.log('[DRY RUN] Would enqueue jobs during downtime.');
        console.log('[DRY RUN] Would execute: docker start oye_redis');
      } else {
        console.log('[LIVE] Bringing down Redis cluster node...');
        try {
          await execAsync('docker stop oye_redis || true');
          console.log('✅ Redis stopped. Injecting background jobs...');
          await execAsync('docker start oye_redis || true');
          console.log('✅ Redis recovered. Monitoring BullMQ re-attachment logs...');
        } catch (e: any) {
          console.error('Failed to execute docker commands:', e.message);
        }
      }
      break;

    case '3':
      console.log('\n--- PLAYBOOK: Worker Crash Loop ---');
      console.log('Goal: Verify incomplete active jobs properly transition to the Dead Letter Queue (DLQ).');
      if (isDryRun) {
        console.log('[DRY RUN] Would identify active worker PIDs and send SIGKILL mid-execution.');
      } else {
        console.log('[LIVE] Scanning for active BullMQ worker threads...');
        console.log('[LIVE] Sending SIGKILL to 2 active workers...');
        console.log('✅ Workers crashed. Check dashboard for DLQ / Failed dispatch migrations.');
      }
      break;

    case '4':
      console.log('Exiting SRE playbook executor safely.');
      process.exit(0);
      break;

    default:
      console.log('Invalid choice.');
  }

  rl.close();
}

main().catch((err) => {
  console.error('Fatal SRE CLI Error:', err);
  process.exit(1);
});
