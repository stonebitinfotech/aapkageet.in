const { OPTION_TYPES } = require('../models/FormField');

const DEFAULT_MAX = { text: 200, textarea: 2000, tel: 20, email: 120, number: 20, date: 20, select: 200, radio: 200, chips: 200 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate submitted answers against the active form fields.
 * Never trusts the client: unknown keys are dropped, options must match, lengths are capped.
 * @returns {{ errors: Object<string,string>, answers: Array, customer: Object, recipientName: string }}
 */
function validateAnswers(fields, raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const errors = {};
  const answers = [];
  const customer = { name: '', phone: '', email: '' };
  let recipientName = '';

  for (const f of fields) {
    let v = input[f.key];
    const max = f.maxLength > 0 ? f.maxLength : DEFAULT_MAX[f.type] || 200;
    const isMulti = f.type === 'chips' && f.multiple;

    // Normalise
    if (isMulti) {
      v = Array.isArray(v) ? v : v ? [v] : [];
      v = v.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean).slice(0, 20);
    } else {
      if (Array.isArray(v)) v = v[0];
      v = v === undefined || v === null ? '' : String(v).trim();
    }

    const empty = isMulti ? v.length === 0 : v === '';
    if (empty) {
      if (f.required) errors[f.key] = 'Ye field zaroori hai';
      continue;
    }

    // Type checks
    if (OPTION_TYPES.includes(f.type)) {
      const list = isMulti ? v : [v];
      if (list.some((x) => !f.options.includes(x))) { errors[f.key] = 'Please choose a valid option'; continue; }
    } else if (v.length > max) {
      errors[f.key] = `Maximum ${max} characters`; continue;
    }

    if (f.type === 'email' && !EMAIL_RE.test(v)) { errors[f.key] = 'Valid email daalo'; continue; }
    if (f.type === 'tel') {
      const digits = v.replace(/[^\d+]/g, '');
      const plain = digits.replace(/^\+/, '');
      if (!/^\d{10,13}$/.test(plain)) { errors[f.key] = 'Valid mobile number daalo (10 digits)'; continue; }
      v = digits;
    }
    if (f.type === 'number' && !Number.isFinite(Number(v))) { errors[f.key] = 'Number daalo'; continue; }
    if (f.type === 'date' && Number.isNaN(Date.parse(v))) { errors[f.key] = 'Valid date choose karo'; continue; }

    answers.push({ key: f.key, label: f.label, value: v });
    if (f.role === 'customer_name') customer.name = v;
    if (f.role === 'customer_phone') customer.phone = v;
    if (f.role === 'customer_email') customer.email = v.toLowerCase();
    if (f.role === 'recipient_name') recipientName = v;
  }

  return { errors, answers, customer, recipientName };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Only allow site-relative upload paths or http(s) URLs for media settings
function safeUrl(u) {
  if (typeof u !== 'string') return '';
  u = u.trim().slice(0, 1000);
  if (!u) return '';
  if ((u.startsWith('/uploads/') || u.startsWith('/demo/')) && !u.includes('..')) return u;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(u)) return u;
  return '';
}

module.exports = { validateAnswers, escapeRegex, safeUrl };
