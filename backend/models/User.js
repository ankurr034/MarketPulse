import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },
  googleId: { type: String, unique: true, sparse: true },
  name: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isRevoked: { type: Boolean, default: false },
  
  // Account-level Brute-Force Protection
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },

  // Two-Factor Authentication (RFC 6238 TOTP)
  isTwoFactorEnabled: { type: Boolean, default: false },
  totpSecretEncrypted: { type: String, default: null },
  totpIv: { type: String, default: null },
  totpAuthTag: { type: String, default: null },
  lastTotpTimestamp: { type: Number, default: 0 },
  backupCodes: [{
    codeHash: { type: String, required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null }
  }],

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
