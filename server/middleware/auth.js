const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const COOKIE = 'admin_session';
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'); // dev fallback: sessions reset on restart

// Returns the Admin document when username + password match a user in the database, else null
async function checkCredentials(username, password) {
  if (!username || !password) return null;
  return Admin.authenticate(username, password);
}

function issueSession(res, admin) {
  const token = jwt.sign({ sub: String(admin._id), username: admin.username, role: 'admin' }, SECRET, { expiresIn: '12h' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

async function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }
  try {
    // The admin must still exist, and sessions from before a password change are no longer valid
    const admin = /^[a-f0-9]{24}$/.test(String(payload.sub)) ? await Admin.findById(payload.sub).lean() : null;
    if (!admin) return res.status(401).json({ error: 'Session expired' });
    if (admin.passwordChangedAt && payload.iat * 1000 < admin.passwordChangedAt.getTime() - 1000) {
      return res.status(401).json({ error: 'Password was changed. Please log in again.' });
    }
    req.admin = { id: String(admin._id), username: admin.username };
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { checkCredentials, issueSession, clearSession, requireAdmin };
