const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const FormField = require('../models/FormField');
const Settings = require('../models/Settings');
const Order = require('../models/Order');
const { validateAnswers } = require('../utils/validate');
const pay = require('../utils/payments');

const router = express.Router();

const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' } });
const verifyLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

const PUBLIC_FIELD_PROPS = 'key label type step placeholder help options multiple required maxLength role order';

// ---------- Site config (content + form) ----------
router.get('/config', async (req, res, next) => {
  try {
    const [settings, fields] = await Promise.all([
      Settings.getMain(),
      FormField.find({ active: true }).sort({ order: 1, _id: 1 }).select(PUBLIC_FIELD_PROPS).lean(),
    ]);
    const s = settings.toObject();
    delete s._id; delete s.__v; delete s.key;
    res.set('Cache-Control', 'no-store');
    res.json({
      settings: s,
      fields: fields.map(({ _id, ...f }) => f),
      payment: { mode: pay.paymentMode() },
    });
  } catch (e) { next(e); }
});

// ---------- Create order ----------
function makeOrderNo() {
  const prefix = (process.env.ORDER_PREFIX || 'SONG').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'SONG';
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (const b of crypto.randomBytes(4)) rand += alphabet[b % alphabet.length];
  return `${prefix}-${ymd}-${rand}`;
}

router.post('/orders', orderLimiter, async (req, res, next) => {
  try {
    const mode = pay.paymentMode();
    if (mode === 'off') return res.status(503).json({ error: 'Payments are not configured yet. Please try again later.' });

    const [settings, fields] = await Promise.all([
      Settings.getMain(),
      FormField.find({ active: true }).sort({ order: 1, _id: 1 }).lean(),
    ]);

    const { errors, answers, customer, recipientName } = validateAnswers(fields, req.body && req.body.answers);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check the highlighted fields', errors });

    const amount = Number(settings.price); // price always comes from the server, never from the browser
    if (!(amount >= 1)) return res.status(500).json({ error: 'Price is not configured' });

    let order;
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      try {
        order = await Order.create({
          orderNo: makeOrderNo(),
          token: crypto.randomBytes(16).toString('hex'),
          answers, customer, recipientName, amount,
          paymentMode: mode,
          ip: req.ip,
          userAgent: String(req.get('user-agent') || '').slice(0, 300),
        });
      } catch (e) {
        if (e.code !== 11000) throw e; // retry only on duplicate orderNo
      }
    }

    const payload = { id: order._id, token: order.token, orderNo: order.orderNo, amount, currency: 'INR', payment: { mode } };

    if (mode === 'razorpay') {
      const rzpOrder = await pay.razorpay().orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: order.orderNo,
        notes: { orderNo: order.orderNo, recipient: recipientName.slice(0, 100) },
      });
      order.razorpay.orderId = rzpOrder.id;
      await order.save();
      payload.payment.keyId = pay.keyId();
      payload.payment.orderId = rzpOrder.id;
      payload.payment.amountPaise = rzpOrder.amount;
    }

    res.status(201).json(payload);
  } catch (e) { next(e); }
});

// Load an order the buyer owns (id + secret token)
async function loadOwnedOrder(req, res) {
  const { id } = req.params;
  const token = String((req.body && req.body.token) || req.query.token || '');
  if (!mongoose.isValidObjectId(id) || !token) { res.status(404).json({ error: 'Order not found' }); return null; }
  const order = await Order.findById(id);
  if (!order || order.token.length !== token.length ||
      !crypto.timingSafeEqual(Buffer.from(order.token), Buffer.from(token))) {
    res.status(404).json({ error: 'Order not found' }); return null;
  }
  return order;
}

function markPaid(order, extra = {}) {
  if (order.paymentStatus === 'paid') return false;
  order.paymentStatus = 'paid';
  order.paidAt = new Date();
  Object.assign(order.razorpay, extra);
  return true;
}

// ---------- Verify Razorpay checkout ----------
router.post('/orders/:id/verify', verifyLimiter, async (req, res, next) => {
  try {
    if (!pay.razorpayEnabled()) return res.status(400).json({ error: 'Razorpay is not configured' });
    const order = await loadOwnedOrder(req, res);
    if (!order) return;

    const { razorpay_payment_id: paymentId, razorpay_order_id: rzpOrderId, razorpay_signature: signature } = req.body || {};
    if (!paymentId || !signature || rzpOrderId !== order.razorpay.orderId ||
        !pay.verifyCheckoutSignature(order.razorpay.orderId, paymentId, signature)) {
      return res.status(400).json({ error: 'Payment verification failed. If money was deducted, contact support with your order number.' });
    }

    markPaid(order, { paymentId, signature });
    try {
      const p = await pay.razorpay().payments.fetch(paymentId);
      if (p && p.method) order.razorpay.method = p.method;
    } catch { /* method is optional info */ }
    await order.save();
    res.json({ ok: true, orderNo: order.orderNo, paymentStatus: order.paymentStatus });
  } catch (e) { next(e); }
});

// ---------- Demo payment (only when DEMO_PAYMENTS=true and no Razorpay keys) ----------
router.post('/orders/:id/demo-pay', verifyLimiter, async (req, res, next) => {
  try {
    if (!pay.demoEnabled()) return res.status(403).json({ error: 'Demo payments are disabled' });
    const order = await loadOwnedOrder(req, res);
    if (!order) return;
    markPaid(order, { paymentId: `demo_${crypto.randomBytes(6).toString('hex')}`, method: 'demo' });
    await order.save();
    res.json({ ok: true, orderNo: order.orderNo, paymentStatus: order.paymentStatus });
  } catch (e) { next(e); }
});

// ---------- Order status (thank-you screen) ----------
router.get('/orders/:id/status', verifyLimiter, async (req, res, next) => {
  try {
    const order = await loadOwnedOrder(req, res);
    if (!order) return;
    res.json({ orderNo: order.orderNo, paymentStatus: order.paymentStatus, deliveryStatus: order.deliveryStatus });
  } catch (e) { next(e); }
});

module.exports = router;
module.exports.markPaid = markPaid;
