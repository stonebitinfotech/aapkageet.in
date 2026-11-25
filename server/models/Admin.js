const crypto = require('crypto');
const { Schema, model } = require('mongoose');

// Password hashing: scrypt (built into Node, no extra dependency). Stored as "scrypt$<salt hex>$<hash hex>".
const KEYLEN = 64;
const MIN_PASSWORD = 8;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyHash(password, stored) {
  const [algo, saltHex, hashHex] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Used when the username doesn't exist, so a wrong username takes as long as a wrong password
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

const AdminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 60 },
    passwordHash: { type: String, required: true },
    passwordChangedAt: { type: Date, default: Date.now }, // sessions issued before this are rejected
    lastLoginAt: Date,
  },
  { timestamps: true }
);

AdminSchema.methods.setPassword = function (password) {
  if (String(password || '').length < MIN_PASSWORD) throw new Error(`Password must be at least ${MIN_PASSWORD} characters`);
  this.passwordHash = hashPassword(password);
  this.passwordChangedAt = new Date();
};

AdminSchema.statics.authenticate = async function (username, password) {
  const admin = await this.findOne({ username: String(username).trim().toLowerCase() });
  const ok = verifyHash(password, admin ? admin.passwordHash : DUMMY_HASH);
  return admin && ok ? admin : null;
};

// Create the admin, or reset the password if the username already exists
AdminSchema.statics.upsertAdmin = async function (username, password) {
  const name = String(username || '').trim().toLowerCase();
  if (!name) throw new Error('Username is required');
  let admin = await this.findOne({ username: name });
  const created = !admin;
  if (!admin) admin = new this({ username: name });
  admin.setPassword(password);
  await admin.save();
  return { admin, created };
};

AdminSchema.set('toJSON', { transform: (doc, ret) => { delete ret.passwordHash; return ret; } });

module.exports = model('Admin', AdminSchema);
module.exports.MIN_PASSWORD = MIN_PASSWORD;
