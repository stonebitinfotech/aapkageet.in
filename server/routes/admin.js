const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const FormField = require('../models/FormField');
const Settings = require('../models/Settings');
const Admin = require('../models/Admin');
const PaymentConfig = require('../models/PaymentConfig');
const { FIELD_TYPES, OPTION_TYPES, ROLES } = FormField;
const { escapeRegex, safeUrl } = require('../utils/validate');
const { checkCredentials, issueSession, clearSession, requireAdmin } = require('../middleware/auth');
const pay = require('../utils/payments');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------------- Auth ----------------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' } });

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username = '', password = '' } = req.body || {};
    const admin = await checkCredentials(String(username).slice(0, 60), String(password).slice(0, 200));
    if (!admin) return res.status(401).json({ error: 'Wrong username or password' });
    admin.lastLoginAt = new Date();
    await admin.save();
    issueSession(res, admin);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

router.use(requireAdmin);

router.get('/me', (req, res) => res.json({
  username: req.admin.username,
  paymentMode: pay.paymentMode(),
  keyMode: /^rzp_test_/.test(pay.keyId()) ? 'test' : /^rzp_live_/.test(pay.keyId()) ? 'live' : '',
}));

// Change own password. Logs out every other session of this admin; the current browser gets a fresh session.
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' } });

router.put('/password', passwordLimiter, async (req, res, next) => {
  try {
    const { currentPassword = '', newPassword = '' } = req.body || {};
    const cur = String(currentPassword).slice(0, 200);
    const next_ = String(newPassword);
    if (next_.length < Admin.MIN_PASSWORD) return res.status(400).json({ error: `New password must be at least ${Admin.MIN_PASSWORD} characters` });
    if (next_.length > 200) return res.status(400).json({ error: 'New password is too long (max 200 characters)' });
    if (next_ === cur) return res.status(400).json({ error: 'New password must be different from the current one' });
    const admin = await Admin.authenticate(req.admin.username, cur);
    if (!admin) return res.status(400).json({ error: 'Current password is wrong' });
    admin.setPassword(next_);
    await admin.save();
    issueSession(res, admin);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------- Orders ----------------
function orderFilter(q) {
  const filter = {};
  if (['pending', 'paid', 'failed', 'refunded'].includes(q.payment)) filter.paymentStatus = q.payment;
  if (['new', 'in_progress', 'delivered', 'cancelled'].includes(q.delivery)) filter.deliveryStatus = q.delivery;
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from && !Number.isNaN(Date.parse(q.from))) filter.createdAt.$gte = new Date(q.from);
    if (q.to && !Number.isNaN(Date.parse(q.to))) filter.createdAt.$lte = new Date(new Date(q.to).getTime() + 86400000 - 1);
  }
  if (q.q && String(q.q).trim()) {
    const re = new RegExp(escapeRegex(String(q.q).trim().slice(0, 100)), 'i');
    filter.$or = [{ orderNo: re }, { 'customer.name': re }, { 'customer.phone': re }, { 'customer.email': re }, { recipientName: re }, { 'razorpay.paymentId': re }];
  }
  return filter;
}

router.get('/stats', async (req, res, next) => {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const [total, paidAgg, todayAgg, toDeliver, pending] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, n: { $sum: 1 }, revenue: { $sum: '$amount' } } }]),
      Order.aggregate([{ $match: { paymentStatus: 'paid', paidAt: { $gte: startOfDay } } }, { $group: { _id: null, n: { $sum: 1 }, revenue: { $sum: '$amount' } } }]),
      Order.countDocuments({ paymentStatus: 'paid', deliveryStatus: { $in: ['new', 'in_progress'] } }),
      Order.countDocuments({ paymentStatus: 'pending' }),
    ]);
    res.json({
      totalOrders: total,
      paidOrders: paidAgg[0] ? paidAgg[0].n : 0,
      revenue: paidAgg[0] ? paidAgg[0].revenue : 0,
      todayOrders: todayAgg[0] ? todayAgg[0].n : 0,
      todayRevenue: todayAgg[0] ? todayAgg[0].revenue : 0,
      toDeliver,
      unpaid: pending,
    });
  } catch (e) { next(e); }
});

router.get('/orders', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 25));
    const filter = orderFilter(req.query);
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-token -ip -userAgent').lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) { next(e); }
});

router.get('/orders/export.csv', async (req, res, next) => {
  try {
    const orders = await Order.find(orderFilter(req.query)).sort({ createdAt: -1 }).limit(20000).lean();
    const answerKeys = [];
    const labels = {};
    for (const o of orders) for (const a of o.answers) if (!labels[a.key]) { labels[a.key] = a.label; answerKeys.push(a.key); }

    const cell = (v) => {
      let s = Array.isArray(v) ? v.join(', ') : v === undefined || v === null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // block spreadsheet formula injection
      return `"${s.replace(/"/g, '""')}"`;
    };
    const head = ['Order No', 'Created', 'Payment', 'Delivery', 'Amount', 'Customer', 'WhatsApp', 'Email', 'Payment ID', 'Method', 'Paid At', 'Delivery Link', 'Notes', ...answerKeys.map((k) => labels[k])];
    const rows = orders.map((o) => {
      const map = Object.fromEntries(o.answers.map((a) => [a.key, a.value]));
      return [o.orderNo, o.createdAt && o.createdAt.toISOString(), o.paymentStatus, o.deliveryStatus, o.amount, o.customer.name, o.customer.phone, o.customer.email,
        o.razorpay && o.razorpay.paymentId, o.razorpay && o.razorpay.method, o.paidAt && o.paidAt.toISOString(), o.deliveryLink, o.notes,
        ...answerKeys.map((k) => map[k])].map(cell).join(',');
    });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + [head.map(cell).join(','), ...rows].join('\r\n'));
  } catch (e) { next(e); }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const order = await Order.findById(req.params.id).select('-token').lean();
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch (e) { next(e); }
});

router.patch('/orders/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const b = req.body || {};
    if (b.deliveryStatus !== undefined) {
      if (!['new', 'in_progress', 'delivered', 'cancelled'].includes(b.deliveryStatus)) return res.status(400).json({ error: 'Invalid delivery status' });
      if (b.deliveryStatus === 'delivered' && order.deliveryStatus !== 'delivered') order.deliveredAt = new Date();
      order.deliveryStatus = b.deliveryStatus;
    }
    if (b.paymentStatus !== undefined) {
      if (!['pending', 'paid', 'failed', 'refunded'].includes(b.paymentStatus)) return res.status(400).json({ error: 'Invalid payment status' });
      if (b.paymentStatus === 'paid' && !order.paidAt) order.paidAt = new Date();
      order.paymentStatus = b.paymentStatus;
    }
    if (b.notes !== undefined) order.notes = String(b.notes).slice(0, 5000);
    if (b.deliveryLink !== undefined) order.deliveryLink = safeUrl(b.deliveryLink);
    await order.save();
    const out = order.toObject(); delete out.token;
    res.json(out);
  } catch (e) { next(e); }
});

router.delete('/orders/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ error: 'Paid orders cannot be deleted. Mark them cancelled instead.' });
    await order.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------- Form builder ----------------
function cleanField(b, existing) {
  const f = {};
  const str = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);
  if (!existing) {
    f.key = str(b.key, 40).toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(f.key)) throw new Error('Key must start with a letter and use only a-z, 0-9 and _ (2-40 chars)');
  }
  if (b.label !== undefined) { f.label = str(b.label, 200); if (!f.label) throw new Error('Label is required'); }
  if (b.type !== undefined) { if (!FIELD_TYPES.includes(b.type)) throw new Error('Invalid field type'); f.type = b.type; }
  if (b.step !== undefined) f.step = str(b.step, 80) || 'Details';
  if (b.placeholder !== undefined) f.placeholder = str(b.placeholder, 200);
  if (b.help !== undefined) f.help = str(b.help, 300);
  if (b.options !== undefined) {
    const list = Array.isArray(b.options) ? b.options : String(b.options).split('\n');
    f.options = [...new Set(list.map((o) => str(o, 200)).filter(Boolean))].slice(0, 100);
  }
  if (b.multiple !== undefined) f.multiple = Boolean(b.multiple);
  if (b.required !== undefined) f.required = Boolean(b.required);
  if (b.active !== undefined) f.active = Boolean(b.active);
  if (b.maxLength !== undefined) f.maxLength = Math.min(10000, Math.max(0, parseInt(b.maxLength, 10) || 0));
  if (b.role !== undefined) { if (!ROLES.includes(b.role)) throw new Error('Invalid role'); f.role = b.role; }

  const type = f.type || (existing && existing.type) || 'text';
  const options = f.options || (existing && existing.options) || [];
  if (OPTION_TYPES.includes(type) && options.length === 0) throw new Error('Add at least one option for this field type');
  return f;
}

async function assertRoleFree(role, exceptId) {
  if (!role) return;
  const other = await FormField.findOne({ role, _id: { $ne: exceptId } });
  if (other) throw new Error(`Another field ("${other.label}") already uses this role`);
}

router.get('/fields', async (req, res, next) => {
  try { res.json(await FormField.find().sort({ order: 1, _id: 1 }).lean()); } catch (e) { next(e); }
});

router.post('/fields', async (req, res, next) => {
  try {
    const data = cleanField(req.body || {});
    if (await FormField.exists({ key: data.key })) return res.status(400).json({ error: 'A field with this key already exists' });
    await assertRoleFree(data.role);
    const last = await FormField.findOne().sort({ order: -1 });
    const field = await FormField.create({ ...data, order: last ? last.order + 1 : 0 });
    res.status(201).json(field);
  } catch (e) { if (e.message && !e.code) return res.status(400).json({ error: e.message }); next(e); }
});

router.put('/fields/reorder', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.filter((id) => mongoose.isValidObjectId(id)) : [];
    await Promise.all(ids.map((id, i) => FormField.updateOne({ _id: id }, { order: i })));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.put('/fields/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const field = await FormField.findById(req.params.id);
    if (!field) return res.status(404).json({ error: 'Not found' });
    const data = cleanField(req.body || {}, field);
    if (data.role !== undefined) await assertRoleFree(data.role, field._id);
    // Contact fields are needed for delivery + payment prefill
    const role = data.role !== undefined ? data.role : field.role;
    if (['customer_phone'].includes(role) && (data.active === false || data.required === false)) {
      return res.status(400).json({ error: 'The WhatsApp/phone field must stay active and required (songs are delivered there).' });
    }
    Object.assign(field, data);
    await field.save();
    res.json(field);
  } catch (e) { if (e.message && !e.code) return res.status(400).json({ error: e.message }); next(e); }
});

router.delete('/fields/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const field = await FormField.findById(req.params.id);
    if (!field) return res.status(404).json({ error: 'Not found' });
    if (field.role === 'customer_phone') return res.status(400).json({ error: 'The WhatsApp/phone field cannot be deleted.' });
    await field.deleteOne();
    res.json({ ok: true }); // old orders keep their answers (label is stored with each answer)
  } catch (e) { next(e); }
});

// ---------------- Settings / page content ----------------
// ---------------- Payment gateway keys (Razorpay) ----------------
// Secrets are write-only: the dashboard only ever sees whether one is set and its last 4 characters.
const hint = (s) => (s ? `••••${String(s).slice(-4)}` : '');
const KEY_ID_RE = /^rzp_(test|live)_[A-Za-z0-9]{8,32}$/;

function paymentView() {
  const c = pay.config();
  const env = { keyId: process.env.RAZORPAY_KEY_ID || '', hasSecret: Boolean(process.env.RAZORPAY_KEY_SECRET) };
  return {
    mode: pay.paymentMode(),
    source: c.source, // 'dashboard' | 'env' | 'none'
    keyId: c.keyId,
    keyMode: /^rzp_live_/.test(c.keyId) ? 'live' : /^rzp_test_/.test(c.keyId) ? 'test' : '',
    keySecretHint: hint(c.keySecret),
    webhookSecretSet: Boolean(c.webhookSecret),
    webhookSecretHint: hint(c.webhookSecret),
    webhookSource: c.webhookSource,
    envHasKeys: Boolean(env.keyId && env.hasSecret),
  };
}

const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' } });

router.get('/payment', (req, res) => res.json(paymentView()));

router.put('/payment', paymentLimiter, async (req, res, next) => {
  try {
    const b = req.body || {};
    const doc = await PaymentConfig.getMain();
    const keyIdIn = String(b.keyId || '').trim();
    const secretIn = String(b.keySecret || '').trim();
    const webhookIn = String(b.webhookSecret || '').trim();

    if (!KEY_ID_RE.test(keyIdIn)) return res.status(400).json({ error: 'Key ID should look like rzp_test_XXXXXXXX or rzp_live_XXXXXXXX' });
    if (secretIn && (secretIn.length < 10 || secretIn.length > 100 || /\s/.test(secretIn))) return res.status(400).json({ error: 'Key Secret looks wrong. Copy it again from Razorpay.' });
    if (webhookIn.length > 200) return res.status(400).json({ error: 'Webhook secret is too long' });

    // A blank secret field means "keep the saved one" — but only if the Key ID is unchanged
    const savedSecret = PaymentConfig.decrypt(doc.keySecretEnc);
    const secret = secretIn || (keyIdIn === doc.keyId ? savedSecret : '');
    if (!secret) return res.status(400).json({ error: 'Enter the Key Secret for this Key ID' });

    await pay.testKeys(keyIdIn, secret);

    doc.keyId = keyIdIn;
    doc.keySecretEnc = PaymentConfig.encrypt(secret);
    if (webhookIn) doc.webhookSecretEnc = PaymentConfig.encrypt(webhookIn);
    else if (b.clearWebhookSecret) doc.webhookSecretEnc = '';
    doc.updatedBy = req.admin.username;
    await doc.save();
    await pay.loadConfig();
    res.json(paymentView());
  } catch (e) {
    if (e.statusCode && e.message && !e.error) return res.status(e.statusCode).json({ error: e.message });
    next(e);
  }
});

// Remove the keys saved in the dashboard (falls back to .env keys, or demo / off)
router.delete('/payment', async (req, res, next) => {
  try {
    await PaymentConfig.deleteOne({ key: 'razorpay' });
    await pay.loadConfig();
    res.json(paymentView());
  } catch (e) { next(e); }
});

router.get('/settings', async (req, res, next) => {
  try { res.json(await Settings.getMain()); } catch (e) { next(e); }
});

router.put('/settings', async (req, res, next) => {
  try {
    const b = req.body || {};
    const s = await Settings.getMain();
    const str = (v, max = 500) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);
    const list = (v, max, fn) => (Array.isArray(v) ? v.slice(0, max).map(fn).filter(Boolean) : undefined);

    for (const k of ['brandName', 'businessName', 'tagline', 'announcement', 'productName', 'deliveryPromise', 'statsText',
      'supportEmail', 'whatsappNumber', 'supportHours', 'instagramHandle', 'instagramFollowers', 'address', 'jurisdiction']) {
      if (b[k] !== undefined) s[k] = str(b[k]);
    }
    for (const k of ['logo', 'heroImage', 'heroVideo', 'storyImage', 'instagramUrl']) if (b[k] !== undefined) s[k] = safeUrl(b[k]);
    if (b.theme !== undefined) s.theme = b.theme === 'dark' ? 'dark' : 'light';
    if (b.price !== undefined) {
      const p = Number(b.price);
      if (!(p >= 1 && p <= 500000)) return res.status(400).json({ error: 'Price must be between 1 and 5,00,000' });
      s.price = Math.round(p * 100) / 100;
    }
    if (b.comparePrice !== undefined) s.comparePrice = Math.max(0, Math.round(Number(b.comparePrice) * 100) / 100 || 0);

    const samples = list(b.samples, 30, (x) => x && { title: str(x.title, 120), subtitle: str(x.subtitle, 200), tag: str(x.tag, 40), image: safeUrl(x.image), audio: safeUrl(x.audio) });
    const occasions = list(b.occasions, 16, (x) => x && str(x.title, 80) && {
      title: str(x.title, 80), text: str(x.text, 200), cta: str(x.cta, 40), image: safeUrl(x.image), icon: str(x.icon, 20),
      prefill: /^[a-z][a-z0-9_]{1,39}=.{1,200}$/.test(str(x.prefill, 240)) ? str(x.prefill, 240) : '' });
    if (occasions) s.occasions = occasions;
    if (samples) s.samples = samples.filter((x) => x.audio || x.title);
    const imgItem = (x) => x && safeUrl(x.image) && { image: safeUrl(x.image), caption: str(x.caption, 200) };
    const reactions = list(b.reactions, 40, imgItem); if (reactions) s.reactions = reactions;
    const shots = list(b.deliveryShots, 40, imgItem); if (shots) s.deliveryShots = shots;
    const testimonials = list(b.testimonials, 50, (x) => x && str(x.text, 1000) && {
      name: str(x.name, 80), text: str(x.text, 1000), rating: Math.min(5, Math.max(1, parseInt(x.rating, 10) || 5)),
      date: str(x.date, 30), source: str(x.source, 40), verified: Boolean(x.verified) });
    const heroSlides = list(b.heroSlides, 12, (x) => x && safeUrl(x.media) && {
      media: safeUrl(x.media), poster: safeUrl(x.poster), name: str(x.name, 40), forLabel: str(x.forLabel, 40), lyric: str(x.lyric, 120) });
    if (heroSlides) s.heroSlides = heroSlides;
    if (testimonials) s.testimonials = testimonials;
    const faqs = list(b.faqs, 40, (x) => x && str(x.q, 300) && { q: str(x.q, 300), a: str(x.a, 3000) });
    if (faqs) s.faqs = faqs;
    if (b.policies && typeof b.policies === 'object') {
      for (const k of ['privacy', 'terms', 'refund', 'return', 'shipping', 'disclaimer', 'contact']) if (b.policies[k] !== undefined) s.policies[k] = str(b.policies[k], 20000);
    }
    await s.save();
    res.json(s);
  } catch (e) { next(e); }
});

// ---------------- Media uploads ----------------
const MIME_EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif',
  'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac',
  'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/ogg': '.ogg',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${MIME_EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error('Only images (jpg/png/webp/gif), audio (mp3/m4a/wav/ogg) and video (mp4/webm/mov) are allowed'))),
});

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 150 MB)' : err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.status(201).json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype.split('/')[0], size: req.file.size });
  });
});

module.exports = router;
