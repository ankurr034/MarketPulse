import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

class TotpService {
  constructor() {
    this.periodSeconds = 30;
    this.digits = 6;
  }

  getEncryptionKey() {
    const raw = process.env.TOTP_ENCRYPTION_KEY || '';
    if (raw.length === 64) {
      return Buffer.from(raw, 'hex');
    }
    // Fallback: derive 32-byte key from JWT_SECRET or raw string
    return crypto.createHash('sha256').update(raw || process.env.JWT_SECRET || 'marketpulse_fallback_key_2026').digest();
  }

  base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      while (bits >= 5) {
        output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += B32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
  }

  base32Decode(str) {
    const clean = str.toUpperCase().replace(/[\s=-]/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (let i = 0; i < clean.length; i++) {
      const idx = B32_ALPHABET.indexOf(clean[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }

  generateSecret(email, issuer = 'MarketPulse') {
    const randomBytes = crypto.randomBytes(20); // 160-bit key
    const secret = this.base32Encode(randomBytes);
    const label = encodeURIComponent(`${issuer}:${email}`);
    const encodedIssuer = encodeURIComponent(issuer);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${this.digits}&period=${this.periodSeconds}`;
    return { secret, otpauthUrl };
  }

  encryptSecret(secretBase32) {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let ciphertext = cipher.update(secretBase32, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag
    };
  }

  decryptSecret(ciphertext, ivHex, authTagHex) {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async generateBackupCodes(count = 8) {
    const codes = [];
    const hashedCodes = [];
    for (let i = 0; i < count; i++) {
      // 8-character human-readable alphanumeric code formatted XXXX-XXXX
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const plain = `${part1}-${part2}`;
      codes.push(plain);
      const hash = await bcrypt.hash(plain, 10);
      hashedCodes.push({ codeHash: hash, used: false });
    }
    return { plainCodes: codes, hashedCodes };
  }

  generateOtpForStep(keyBuffer, step) {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(step));
    const hmac = crypto.createHmac('sha1', keyBuffer).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const bin = ((hmac[offset] & 0x7f) << 24) |
                ((hmac[offset + 1] & 0xff) << 16) |
                ((hmac[offset + 2] & 0xff) << 8) |
                (hmac[offset + 3] & 0xff);
    return (bin % 1000000).toString().padStart(6, '0');
  }

  /**
   * RFC 6238 verification with window skew and replay prevention
   */
  verifyTotp(secretBase32, code, lastTotpTimestamp = 0, window = 1) {
    if (!secretBase32 || !code || typeof code !== 'string') {
      return { valid: false, error: 'Invalid code or secret' };
    }
    const cleanCode = code.trim().replace(/\s/g, '');
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return { valid: false, error: 'Code must be a 6-digit number' };
    }

    const keyBuffer = this.base32Decode(secretBase32);
    const currentStep = Math.floor(Date.now() / 1000 / this.periodSeconds);

    // Test steps from currentStep - window to currentStep + window
    for (let step = currentStep - window; step <= currentStep + window; step++) {
      const expected = this.generateOtpForStep(keyBuffer, step);
      if (expected === cleanCode) {
        // Prevent replay attacks within the same or prior period
        if (step <= lastTotpTimestamp) {
          return { valid: false, error: 'Token already used. Please wait for the next 30-second code.' };
        }
        return { valid: true, matchedStep: step };
      }
    }

    return { valid: false, error: 'Invalid authentication code' };
  }

  async verifyBackupCode(plainCode, backupCodesArray) {
    if (!plainCode || !backupCodesArray || !Array.isArray(backupCodesArray)) {
      return { valid: false };
    }
    const cleanCode = plainCode.trim().toUpperCase();

    for (let i = 0; i < backupCodesArray.length; i++) {
      const item = backupCodesArray[i];
      if (!item.used && item.codeHash) {
        const matches = await bcrypt.compare(cleanCode, item.codeHash);
        if (matches) {
          item.used = true;
          item.usedAt = new Date();
          return { valid: true, matchedIndex: i };
        }
      }
    }
    return { valid: false };
  }
}

export default new TotpService();
