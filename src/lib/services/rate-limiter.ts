import { Redis } from 'ioredis'; // Dynamic loading or graceful fallbacks if not installed

// Standard in-memory fallback cache
interface InMemBucket {
  tokens: number;
  lastRefilled: number;
}

const memoryStore = new Map<string, InMemBucket>();

let redisClient: Redis | null = null;

// Initialize Redis connection if configured
const redisUrl = process.env.REDIS_URL;
if (redisUrl && !redisUrl.includes('placeholder')) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000, // keep timeouts short to prevent system stalls
    });
    
    redisClient.on('error', (err) => {
      console.warn('[Rate Limiter] Redis connection lost. Falling back to local in-memory store.', err.message);
    });
  } catch (e: any) {
    console.warn('[Rate Limiter] Failed to initialize Redis client. Falling back to in-memory.', e.message);
  }
}

/**
 * Check if a client IP address has exceeded request limits for a specific route.
 * Employs Token Bucket algorithm. Max tokens: 60, refill rate: 1 token/second (1/s).
 */
export async function isRateLimited(
  ip: string,
  route: string,
  capacity = 60,
  refillRatePerSec = 1
): Promise<{ limited: boolean; remaining: number; resetHeader: number }> {
  const key = `ratelimit:${route}:${ip}`;
  const now = Math.floor(Date.now() / 1000);

  // === REDIS STORE PATH ===
  if (redisClient && redisClient.status === 'ready') {
    try {
      const script = `
        local key_tokens = KEYS[1]
        local key_last = KEYS[2]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        local stored_tokens = redis.call('get', key_tokens)
        local stored_last = redis.call('get', key_last)

        local tokens = capacity
        local last_refill = now

        if stored_tokens and stored_last then
          local elapsed = math.max(0, now - tonumber(stored_last))
          tokens = math.min(capacity, tonumber(stored_tokens) + elapsed * refill_rate)
        end

        if tokens >= 1 then
          tokens = tokens - 1
          redis.call('setex', key_tokens, 3600, tostring(tokens))
          redis.call('setex', key_last, 3600, tostring(now))
          return {0, math.floor(tokens)}
        else
          return {1, 0}
        end
      `;

      const result = await redisClient.eval(
        script,
        2,
        `${key}:tokens`,
        `${key}:last_refill`,
        capacity.toString(),
        refillRatePerSec.toString(),
        now.toString()
      ) as [number, number] | null;

      if (Array.isArray(result) && result.length === 2) {
        const limited = result[0] === 1;
        const remaining = Number(result[1]);
        const nextRefillIn = Math.ceil((capacity - remaining) / refillRatePerSec);
        return { limited, remaining, resetHeader: nextRefillIn };
      }
    } catch (err: any) {
      console.warn('[Rate Limiter] Redis Lua evaluation failed. Falling back to memory.', err.message);
    }
  }

  // === IN-MEMORY FALLBACK PATH ===
  const bucket = memoryStore.get(key);
  let tokens = capacity;
  let lastRefilled = now;

  if (bucket) {
    const elapsed = Math.max(0, now - bucket.lastRefilled);
    tokens = Math.min(capacity, bucket.tokens + elapsed * refillRatePerSec);
    lastRefilled = now;
  }

  if (tokens >= 1) {
    tokens -= 1;
    memoryStore.set(key, { tokens, lastRefilled });
    const nextRefillIn = Math.ceil((capacity - tokens) / refillRatePerSec);
    return { limited: false, remaining: Math.floor(tokens), resetHeader: nextRefillIn };
  } else {
    const nextRefillIn = Math.ceil((capacity - tokens) / refillRatePerSec);
    return { limited: true, remaining: 0, resetHeader: nextRefillIn };
  }
}
