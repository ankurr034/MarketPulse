const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'temptoken',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'accesstoken',
  'upstox_access_token'
]);

function sanitize(obj, depth = 0) {
  if (depth > 4 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitize(item, depth + 1));

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

class Logger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const cleanMeta = sanitize(meta);

    if (this.isProduction) {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...cleanMeta
      });
    }

    const metaStr = Object.keys(cleanMeta).length ? ' ' + JSON.stringify(cleanMeta) : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  info(message, meta) {
    console.log(this.format('INFO', message, meta));
  }

  warn(message, meta) {
    console.warn(this.format('WARN', message, meta));
  }

  error(message, meta) {
    console.error(this.format('ERROR', message, meta));
  }

  debug(message, meta) {
    if (process.env.DEBUG || !this.isProduction) {
      console.log(this.format('DEBUG', message, meta));
    }
  }
}

export default new Logger();
