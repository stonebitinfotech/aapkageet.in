const { Schema, model } = require('mongoose');

const AnswerSchema = new Schema(
  { key: String, label: String, value: Schema.Types.Mixed },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    token: { type: String, required: true }, // secret the buyer's browser uses to verify/poll this order
    answers: { type: [AnswerSchema], default: [] },
    customer: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    recipientName: { type: String, default: '' },
    amount: { type: Number, required: true }, // INR (rupees)
    currency: { type: String, default: 'INR' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
    deliveryStatus: { type: String, enum: ['new', 'in_progress', 'delivered', 'cancelled'], default: 'new', index: true },
    paymentMode: { type: String, enum: ['razorpay', 'demo'], default: 'razorpay' },
    razorpay: {
      orderId: { type: String, index: true },
      paymentId: String,
      signature: String,
      method: String,
    },
    paidAt: Date,
    deliveredAt: Date,
    deliveryLink: { type: String, default: '' },
    notes: { type: String, default: '' },
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });

module.exports = model('Order', OrderSchema);
