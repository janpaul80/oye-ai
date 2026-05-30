import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { QueueService } from '../src/lib/services/queue';

async function runStressTest() {
  console.log('🚀 Starting Oye AI Queue Stress & Durability Test Suite...');
  const TOTAL_JOBS = 50;
  const orgId = '88888888-8888-8888-8888-888888888888';
  const convId = 'mock-conv-1';

  console.log(`[Stress Test] Enqueuing ${TOTAL_JOBS} jobs to "incoming_messages"...`);
  
  const promises = [];
  
  for (let i = 0; i < TOTAL_JOBS; i++) {
    // 10% of jobs will simulate a malformed payload to purposely fail and hit DLQ
    const isMalformed = i % 10 === 0;
    
    promises.push(
      QueueService.addJob(
        'incoming_messages',
        'ai.cascade_inference',
        {
          orgId,
          conversationId: convId,
          latestMessageBody: isMalformed ? 'FAIL_SIMULATION' : `Valid stress test payload ${i}`,
          fromPhone: '+15550000000'
        },
        {
          organizationId: orgId,
          traceId: `stress_test_${i}`,
          maxRetries: isMalformed ? 1 : 3 // Fast fail for malformed
        }
      )
    );
  }

  await Promise.all(promises);
  console.log(`✅ Successfully pushed ${TOTAL_JOBS} jobs to Redis Queue.`);
  
  console.log('⏳ Waiting 5 seconds to allow worker telemetry to update...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Output Queue Telemetry
  const { TelemetryService } = await import('../src/lib/services/observability');
  const telemetry = await TelemetryService.getSystemTelemetry();
  
  console.log('\n📊 POST-TEST TELEMETRY REPORT:');
  console.log(JSON.stringify(telemetry, null, 2));

  console.log('\n✅ Stress test execution complete.');
  
  process.exit(0);
}

runStressTest().catch((err) => {
  console.error('Stress test crashed:', err);
  process.exit(1);
});
