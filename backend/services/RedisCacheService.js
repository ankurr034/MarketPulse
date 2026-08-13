import { createClient } from 'redis';

class RedisCacheService {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    });
    
    this.memoryFallback = new Map();
    this.isRedisConnected = false;

    this.client.on('error', (err) => {
      console.warn('Redis connection error, falling back to in-memory cache.', err.message);
      this.isRedisConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.isRedisConnected = true;
    });

    this.connect();
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
}

export default new RedisCacheService();

