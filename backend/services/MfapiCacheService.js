import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve cache directory reliably whether running from root or backend directory
function resolveCacheDir() {
  const candidates = [
    path.resolve('data/mfapi_cache'),
    path.resolve('backend/data/mfapi_cache'),
    path.resolve(__dirname, '../data/mfapi_cache'),
    path.resolve(__dirname, '../../data/mfapi_cache')
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  const defaultDir = candidates[0];
  fs.mkdirSync(defaultDir, { recursive: true });
  return defaultDir;
}

const CACHE_DIR = resolveCacheDir();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FAILED_TTL_MS = 10 * 60 * 1000; // 10 minutes cache for failures

class MfapiCacheService {
  constructor() {
    this.cacheDir = CACHE_DIR;
    this.memoryCache = new Map(); // L1 Cache: schemeCode -> { data, timestamp }
    this.failedCache = new Map(); // In-memory failure cooldown cache
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Fast L1 / L2 NAV time-series retrieval:
   * 1. Check L1 in-memory Map (0ms)
   * 2. Check L2 disk file cache
   * 3. Fallback to network only if missing/expired and network reachable
   * 4. Graceful offline fallback: if network fails, return cached data regardless of age
   */
  async getSchemeData(schemeCode) {
    const codeStr = String(schemeCode).trim();
    if (!codeStr) return null;

    // 1. Check L1 Memory Cache (Fastest)
    const memItem = this.memoryCache.get(codeStr);
    if (memItem && (Date.now() - memItem.timestamp < CACHE_TTL_MS)) {
      return memItem.data;
    }

    // 2. Check L2 Disk File Cache
    const cacheFile = path.join(this.cacheDir, `${codeStr}.json`);
    let diskData = null;
    let diskMtime = 0;

    if (fs.existsSync(cacheFile)) {
      try {
        const stats = fs.statSync(cacheFile);
        diskMtime = stats.mtimeMs;
        const content = fs.readFileSync(cacheFile, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && parsed.data && parsed.data.length > 0) {
          diskData = parsed;
          const age = Date.now() - diskMtime;
          // If fresh (< 24h), store in L1 and return immediately
          if (age < CACHE_TTL_MS) {
            this.memoryCache.set(codeStr, { data: diskData, timestamp: Date.now() });
            return diskData;
          }
        }
      } catch (err) {
        console.warn(`[MfapiCacheService] Error reading cache file for ${codeStr}:`, err.message);
      }
    }

    // Check in-memory failure cooldown
    const failedTime = this.failedCache.get(codeStr);
    if (failedTime && (Date.now() - failedTime < FAILED_TTL_MS)) {
      if (diskData) {
        // Return stale disk cache during failure cooldown
        this.memoryCache.set(codeStr, { data: diskData, timestamp: Date.now() });
        return diskData;
      }
      throw new Error(`Rate limit / failure cooldown active for ${codeStr}`);
    }

    // 3. Network Fetch from api.mfapi.in
    try {
      const res = await axios.get(`https://api.mfapi.in/mf/${codeStr}`, { timeout: 10000 });
      if (res && res.data && res.data.data && res.data.data.length > 0) {
        this.memoryCache.set(codeStr, { data: res.data, timestamp: Date.now() });
        this.failedCache.delete(codeStr);
        try {
          fs.writeFileSync(cacheFile, JSON.stringify(res.data, null, 2), 'utf8');
        } catch (writeErr) {
          console.warn(`[MfapiCacheService] Error writing disk cache for ${codeStr}:`, writeErr.message);
        }
        return res.data;
      }
      throw new Error(`Invalid response format from api.mfapi.in for ${codeStr}`);
    } catch (err) {
      this.failedCache.set(codeStr, Date.now());
      // Graceful fallback: If network call fails (e.g. offline/rate-limited), return existing disk data if available
      if (diskData) {
        this.memoryCache.set(codeStr, { data: diskData, timestamp: Date.now() });
        return diskData;
      }
      throw err;
    }
  }

  clearFailedCache() {
    this.failedCache.clear();
  }
}

export default new MfapiCacheService();
