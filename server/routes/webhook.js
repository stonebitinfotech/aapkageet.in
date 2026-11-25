// Razorpay webhook: marks orders paid even if the buyer closes the browser right after paying.
// Mounted with express.raw() so the signature can be checked against the exact bytes.
const express = require('express');
const Order = require('../models/Order');
const pay = require('../utils/payments');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const signature = req.get('x-razorpay-signature');
    if (!Buffer.isBuffer(req.body) || !pay.verifyWebhookSignature(req.body, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    const event = JSON.parse(req.body.toString('utf8'));
    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    const rzpOrderId = (payment && payment.order_id) ||
      (event.payload && event.payload.order && event.payload.order.entity && event.payload.order.entity.id);
    if (!rzpOrderId) return res.json({ ok: true });

    const order = await Order.findOne({ 'razorpay.orderId': rzpOrderId });
    if (!order) return res.json({ ok: true });

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      if (order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
      }
      if (payment) {
        order.razorpay.paymentId = order.razorpay.paymentId || payment.id;
        order.razorpay.method = payment.method || order.razorpay.method;
      }
      await order.save();
    } else if (event.event === 'payment.failed' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'failed';
      await order.save();
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
