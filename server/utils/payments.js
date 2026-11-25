const crypto = require('crypto');
const PaymentConfig = require('../models/PaymentConfig');

// Effective Razorpay config, cached in memory. Keys saved in Dashboard → Settings win over .env;
// .env (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET) is the fallback.
let cfg = { keyId: '', keySecret: '', webhookSecret: '', source: 'none' };
let client = null;

function envConfig() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  };
}

// Call at startup and after the keys are changed in the dashboard
async function loadConfig() {
  const env = envConfig();
  const doc = await PaymentConfig.findOne({ key: 'razorpay' }).lean();
  const db = doc
    ? { keyId: doc.keyId || '', keySecret: PaymentConfig.decrypt(doc.keySecretEnc), webhookSecret: PaymentConfig.decrypt(doc.webhookSecretEnc) }
    : { keyId: '', keySecret: '', webhookSecret: '' };

  // Key ID + secret are used as a pair (never mix a dashboard key ID with an .env secret)
  if (db.keyId && db.keySecret) cfg = { keyId: db.keyId, keySecret: db.keySecret, source: 'dashboard' };
  else if (env.keyId && env.keySecret) cfg = { keyId: env.keyId, keySecret: env.keySecret, source: 'env' };
  else cfg = { keyId: '', keySecret: '', source: 'none' };
  cfg.webhookSecret = db.webhookSecret || env.webhookSecret;
  cfg.webhookSource = db.webhookSecret ? 'dashboard' : env.webhookSecret ? 'env' : 'none';
  client = null;
  return cfg;
}

function config() { return cfg; }
function keyId() { return cfg.keyId; }

function razorpayEnabled() {
  return Boolean(cfg.keyId && cfg.keySecret);
}

function demoEnabled() {
  return !razorpayEnabled() && process.env.DEMO_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production';
}

function paymentMode() {
  if (razorpayEnabled()) return 'razorpay';
  if (demoEnabled()) return 'demo';
  return 'off';
}

function razorpay() {
  if (!client) {
    const Razorpay = require('razorpay');
    client = new Razorpay({ key_id: cfg.keyId, key_secret: cfg.keySecret });
  }
  return client;
}

// Checks a key pair against Razorpay before it is saved. Resolves true, or throws with a readable message.
async function testKeys(id, secret) {
  const Razorpay = require('razorpay');
  try {
    await new Razorpay({ key_id: id, key_secret: secret }).orders.all({ count: 1 });
    return true;
  } catch (e) {
    const status = e && (e.statusCode || (e.error && e.error.code));
    if (e && e.statusCode === 401) throw Object.assign(new Error('Razorpay rejected these keys (authentication failed). Check the Key ID and Key Secret.'), { statusCode: 400 });
    throw Object.assign(new Error(`Could not reach Razorpay to check the keys${status ? ` (${status})` : ''}. Try again.`), { statusCode: 502 });
  }
}

function safeEqualHex(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
function verifyCheckoutSignature(orderId, paymentId, signature) {
  if (!cfg.keySecret) return false;
  const expected = crypto.createHmac('sha256', cfg.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

// Webhook signature: HMAC_SHA256(raw_body, webhook_secret)
function verifyWebhookSignature(rawBody, signature) {
  const secret = cfg.webhookSecret;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

module.exports = {
  loadConfig, config, keyId, testKeys,
  razorpayEnabled, demoEnabled, paymentMode, razorpay, verifyCheckoutSignature, verifyWebhookSignature,
};
