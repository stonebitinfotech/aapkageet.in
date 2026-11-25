const crypto = require('crypto');
const { Schema, model } = require('mongoose');

// Razorpay keys entered in Dashboard → Settings. Kept in their own collection (never in Settings, which the public
// site API returns), and the secrets are encrypted at rest with AES-256-GCM using a key derived from JWT_SECRET.

function encKey() {
  const base = process.env.JWT_SECRET;
  if (!base) return null;
  return crypto.scryptSync(base, 'payment-config-v1', 32);
}

function encrypt(plain) {
  const key = encKey();
  if (!key) throw Object.assign(new Error('Set JWT_SECRET in .env before saving payment keys (it is used to encrypt them).'), { statusCode: 400 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${data.toString('hex')}`;
}

// Returns '' when empty or when it can't be decrypted (e.g. JWT_SECRET was changed)
function decrypt(stored) {
  if (!stored) return '';
  try {
    const [v, ivHex, tagHex, dataHex] = String(stored).split(':');
    const key = encKey();
    if (v !== 'v1' || !key) return '';
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  } catch {
    console.warn('⚠  Could not decrypt a saved payment key (was JWT_SECRET changed?). Re-enter the keys in Dashboard → Settings.');
    return '';
  }
}

const PaymentConfigSchema = new Schema(
  {
    key: { type: String, unique: true, default: 'razorpay' },
    keyId: { type: String, default: '' },
    keySecretEnc: { type: String, default: '' },
    webhookSecretEnc: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

PaymentConfigSchema.statics.getMain = async function () {
  let doc = await this.findOne({ key: 'razorpay' });
  if (!doc) doc = await this.create({ key: 'razorpay' });
  return doc;
};

module.exports = model('PaymentConfig', PaymentConfigSchema);
module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;
