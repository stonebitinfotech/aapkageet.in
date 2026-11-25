require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./db');
const { ensureSeed } = require('./seed');
const pay = require('./utils/payments');

const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Webhook must get the raw body (signature check) -mount before express.json()
app.use('/api/razorpay/webhook', express.raw({ type: '*/*', limit: '1mb' }), require('./routes/webhook'));

app.use(express.json({ limit: '300kb' }));
app.use(cookieParser());

app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/public'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));
app.get(['/admin', '/admin/'], (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html')));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status === 404 || err.statusCode === 404) return res.status(404).json({ error: 'Not found' });
  console.error(err);
  const msg = err.error && err.error.description ? `Payment gateway: ${err.error.description}` : 'Something went wrong. Please try again.';
  res.status(err.statusCode && err.statusCode < 500 ? err.statusCode : 500).json({ error: msg });
});

const PORT = Number(process.env.PORT) || 3000;

connectDB()
  .then(ensureSeed)
  .then(pay.loadConfig)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🎵 Site:       http://localhost:${PORT}`);
      console.log(`🔐 Dashboard:  http://localhost:${PORT}/admin`);
      console.log(`💳 Payments:   ${pay.paymentMode()}${pay.paymentMode() === 'off' ? ' (set Razorpay keys or DEMO_PAYMENTS=true in .env)' : ''}\n`);
    });
  })
  .catch((e) => {
    console.error('Failed to start:', e.message);
    process.exit(1);
  });
