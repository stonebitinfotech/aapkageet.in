const { Schema, model } = require('mongoose');

const FIELD_TYPES = ['text', 'textarea', 'tel', 'email', 'number', 'date', 'select', 'radio', 'chips'];
const OPTION_TYPES = ['select', 'radio', 'chips'];
// Roles map a field to the customer's contact details (used for Razorpay prefill + dashboard columns)
const ROLES = ['', 'customer_name', 'customer_phone', 'customer_email', 'recipient_name'];

const FormFieldSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, match: /^[a-z][a-z0-9_]{1,39}$/ },
    label: { type: String, required: true, maxlength: 200 },
    type: { type: String, enum: FIELD_TYPES, default: 'text' },
    step: { type: String, default: 'Details', maxlength: 80 }, // popup step / section title
    placeholder: { type: String, default: '', maxlength: 200 },
    help: { type: String, default: '', maxlength: 300 },
    options: { type: [String], default: [] },
    multiple: { type: Boolean, default: false }, // chips: allow selecting many
    required: { type: Boolean, default: false },
    maxLength: { type: Number, default: 0 }, // 0 = default limit for the type
    active: { type: Boolean, default: true },
    role: { type: String, enum: ROLES, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = model('FormField', FormFieldSchema);
module.exports.FIELD_TYPES = FIELD_TYPES;
module.exports.OPTION_TYPES = OPTION_TYPES;
module.exports.ROLES = ROLES;
