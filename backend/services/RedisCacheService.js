import { createClient } from 'redis';

class RedisCacheService {
  constructor() {
    this.memoryFallback = new Map();
    this.rateLimitStores = new Set();
    this.isRedisConnected = false;
    this.hasLoggedError = false;

    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      socket: {
        reconnectStrategy: (retries) => {
          // Never permanently give up: retry with capped exponential backoff
          return Math.min(retries * 200, 3000);
        }
      }
    });

    this.client.on('error', (err) => {
      if (!this.hasLoggedError) {
        console.warn('[REDIS WARNING] Redis connection unavailable. Operating in local in-memory fallback mode. NOTE: In-memory fallback is single-instance only and CANNOT synchronize token revocations, distributed locks, or rate limits across multiple backend instances.');
        this.hasLoggedError = true;
      }
      this.isRedisConnected = false;
    });

    this.client.on('connect', () => {
      console.log('[REDIS] Connected to Redis cluster — distributed caching, rate-limiting, and token revocation active.');
      this.isRedisConnected = true;
      this.hasLoggedError = false;
    });

    this.connect();
    this._startCleanupSweeper();
  }

  /**
   * Periodic background sweeper to evict expired in-memory fallback entries.
   * Prevents unbounded heap growth under high volumes of distinct IP addresses.
   */
  _startCleanupSweeper() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      // Clean memoryFallback
      for (const [key, item] of this.memoryFallback.entries()) {
        if (item && item.expiresAt && now > item.expiresAt) {
          this.memoryFallback.delete(key);
        }
      }
      // Clean rate limit stores
      for (const store of this.rateLimitStores) {
        if (store && typeof store.cleanupExpired === 'function') {
          store.cleanupExpired(now);
        }
      }
    }, 60000);

    // Unref timer so it does not prevent Node process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Returns true if connected to Redis (distributed multi-instance mode),
   * or false if operating in local in-memory fallback (single-instance only).
   */
  isDistributed() {
    return this.isRedisConnected;
  }

  async connect() {
    try {
      await this.client.connect();
    } catch (e) {
      this.isRedisConnected = false;
    }
  }

  async get(key) {
    if (this.isRedisConnected) {
      try {
        const val = await this.client.get(key);
        return val ? JSON.parse(val) : null;
      } catch (e) {
        return this._getMemory(key);
      }
    }
    return this._getMemory(key);
  }

  async set(key, value, ttlSeconds = 3600) {
    if (this.isRedisConnected) {
      try {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (e) {
        this._setMemory(key, value, ttlSeconds);
        return;
      }
    }
    this._setMemory(key, value, ttlSeconds);
  }

  async acquireLock(lockKey, ttlSeconds = 300) {
    if (this.isRedisConnected) {
      try {
        const acquired = await this.client.set(lockKey, 'LOCKED', {
          NX: true,
          EX: ttlSeconds
        });
        return acquired === 'OK';
      } catch (e) {
        return this._acquireMemoryLock(lockKey, ttlSeconds);
      }
    }
    return this._acquireMemoryLock(lockKey, ttlSeconds);
  }

  async releaseLock(lockKey) {
    if (this.isRedisConnected) {
      try {
        await this.client.del(lockKey);
        return;
      } catch (e) {
        this.memoryFallback.delete(`lock:${lockKey}`);
        return;
      }
    }
    this.memoryFallback.delete(`lock:${lockKey}`);
  }

  _acquireMemoryLock(lockKey, ttlSeconds) {
    const key = `lock:${lockKey}`;
    const item = this.memoryFallback.get(key);
    if (item && Date.now() < item.expiresAt) {
      return false;
    }
    this.memoryFallback.set(key, {
      value: 'LOCKED',
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
    return true;
  }

  _getMemory(key) {
    const item = this.memoryFallback.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  _setMemory(key, value, ttlSeconds) {
    this.memoryFallback.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  /**
   * Distributed JWT token revocation in Redis (with TTL) and memory fallback.
   * Invalidates tokens across multiple backend instances and server restarts.
   */
  async revokeToken(token, ttlSeconds = 7 * 24 * 3600) {
    const key = `revoked_token:${token}`;
    if (this.isRedisConnected) {
      try {
        await this.client.setEx(key, ttlSeconds, 'REVOKED');
        return;
      } catch (e) {
        // Fall back to memory
      }
    }
    this._setMemory(key, 'REVOKED', ttlSeconds);
  }

  /**
   * Checks whether a token is revoked in Redis or memory fallback.
   */
  async isTokenRevoked(token) {
    const key = `revoked_token:${token}`;
    if (this.isRedisConnected) {
      try {
        const val = await this.client.get(key);
        return val === 'REVOKED';
      } catch (e) {
        // Fall back to memory
      }
    }
    return this._getMemory(key) === 'REVOKED';
  }

  /**
   * Distributed rate limit store with atomic Redis Lua script evaluation.
   * Guaranteed TTL assignment even if interrupted.
   * Falls back automatically to memory store with active sweeper when Redis is offline.
   */
  createRateLimitStore(windowMs = 15 * 60 * 1000) {
    const service = this;
    const memoryStore = new Map();

    const storeInstance = {
      cleanupExpired(now) {
        for (const [k, v] of memoryStore.entries()) {
          if (v && v.resetTime <= now) {
            memoryStore.delete(k);
          }
        }
      },
      async increment(key) {
        if (service.isRedisConnected) {
          try {
            const redisKey = `rl:${key}`;
            // Atomic INCR + PEXPIRE evaluation via Lua script to prevent orphaned keys without TTL
            const script = `
              local hits = redis.call('INCR', KEYS[1])
              if hits == 1 then
                redis.call('PEXPIRE', KEYS[1], ARGV[1])
              end
              local ttl = redis.call('PTTL', KEYS[1])
              if ttl < 0 then
                redis.call('PEXPIRE', KEYS[1], ARGV[1])
                ttl = tonumber(ARGV[1])
              end
              return {hits, ttl}
            `;
            const result = await service.client.eval(script, {
              keys: [redisKey],
              arguments: [String(windowMs)]
            });
            const hits = Number(result[0]);
            const ttl = Number(result[1]);
            return {
              totalHits: hits,
              resetTime: new Date(Date.now() + Math.max(0, ttl))
            };
          } catch (e) {
            // Graceful fallback to memory on error
          }
        }
        const now = Date.now();
        let entry = memoryStore.get(key);
        if (!entry || entry.resetTime <= now) {
          entry = { totalHits: 1, resetTime: now + windowMs };
          memoryStore.set(key, entry);
        } else {
          entry.totalHits++;
        }
        return {
          totalHits: entry.totalHits,
          resetTime: new Date(entry.resetTime)
        };
      },
      async decrement(key) {
        if (service.isRedisConnected) {
          try {
            await service.client.decr(`rl:${key}`);
            return;
          } catch (e) {}
        }
        const entry = memoryStore.get(key);
        if (entry && entry.totalHits > 0) entry.totalHits--;
      },
      async resetKey(key) {
        if (service.isRedisConnected) {
          try {
            await service.client.del(`rl:${key}`);
            return;
          } catch (e) {}
        }
        memoryStore.delete(key);
      }
    };

    service.rateLimitStores.add(storeInstance);
    return storeInstance;
  }
}

export default new RedisCacheService();
