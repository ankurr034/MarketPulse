class CacheService {
  constructor() {
    this.cache = new Map();
    // Cache tiers TTL in milliseconds
    this.TIERS = {
      REALTIME: 30 * 1000,      // 30 seconds
      STANDARD: 5 * 60 * 1000,   // 5 minutes
      SLOW: 60 * 60 * 1000,      // 1 hour
      MACRO: 6 * 60 * 60 * 1000, // 6 hours
      STATIC: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, tier = 'STANDARD') {
    const ttl = this.TIERS[tier] || this.TIERS.STANDARD;
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
    return value;
  }

  invalidate(pattern) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.delete(pattern);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default new CacheService();
