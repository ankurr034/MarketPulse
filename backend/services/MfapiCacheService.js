import fs from 'fs';
import path from 'path';
import axios from 'axios';

const CACHE_DIR = path.resolve('data/mfapi_cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FAILED_TTL_MS = 5 * 60 * 1000; // 5 minutes cache for failures

class MfapiCacheService {
  constructor() {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  async getSchemeData(schemeCode) {
    const cacheFile = path.join(CACHE_DIR, `${schemeCode}.json`);
    const failedFile = path.join(CACHE_DIR, `${schemeCode}.failed.json`);
    
    // Check successful local file cache first
    if (fs.existsSync(cacheFile)) {
      try {
        const stats = fs.statSync(cacheFile);
        const age = Date.now() - stats.mtimeMs;
        if (age < CACHE_TTL_MS) {
          const content = fs.readFileSync(cacheFile, 'utf8');
          const data = JSON.parse(content);
          if (data && data.data && data.data.length > 0) {
            return data;
          }
        }
      } catch (err) {
        console.warn(`[MfapiCacheService] Error reading cache file for ${schemeCode}:`, err.message);
      }
    }

    // Check failed request cache to avoid spamming/freezing when api.mfapi.in is rate-limiting
    if (fs.existsSync(failedFile)) {
      try {
        const stats = fs.statSync(failedFile);
        const age = Date.now() - stats.mtimeMs;
        if (age < FAILED_TTL_MS) {
          throw new Error(`Rate limit / failure cooldown active for ${schemeCode} (cached error)`);
        }
      } catch (err) {
        if (err.message.includes('cooldown')) {
          throw err;
        }
      }
    }

    // Call API and write to cache on success
    try {
      const res = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`, { timeout: 15000 });
      if (res && res.data && res.data.data && res.data.data.length > 0) {
        try {
          fs.writeFileSync(cacheFile, JSON.stringify(res.data, null, 2), 'utf8');
          // Clean up failed file if it exists
          if (fs.existsSync(failedFile)) {
            fs.unlinkSync(failedFile);
          }
        } catch (err) {
          console.warn(`[MfapiCacheService] Error writing cache file for ${schemeCode}:`, err.message);
        }
        return res.data;
      }
      throw new Error(`Invalid response format from api.mfapi.in for ${schemeCode}`);
    } catch (err) {
      // Cache the failure so subsequent requests in the next 5 mins fail instantly
      try {
        fs.writeFileSync(failedFile, JSON.stringify({ error: err.message, timestamp: Date.now() }), 'utf8');
      } catch (writeErr) {
        console.warn(`[MfapiCacheService] Error writing failure file for ${schemeCode}:`, writeErr.message);
      }
      throw err;
    }
  }

  clearFailedCache() {
    try {
      if (fs.existsSync(CACHE_DIR)) {
        const files = fs.readdirSync(CACHE_DIR);
        files.forEach(f => {
          if (f.endsWith('.failed.json')) {
            fs.unlinkSync(path.join(CACHE_DIR, f));
          }
        });
      }
    } catch (e) {
      console.warn('Failed to clear failed cache files:', e.message);
    }
  }
}

export default new MfapiCacheService();
