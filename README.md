# Personalised Song Store

A one-page website for selling personalised songs. It has:
- a multi-step "Create their song" popup
- Razorpay checkout (UPI, GPay, PhonePe, Paytm, cards, netbanking)
- an admin dashboard backed by MongoDB

```
Website     http://localhost:3000
Dashboard   http://localhost:3000/admin
```

## What's included

| Part | What it does |
|---|---|
| **Landing page** | Hero with a live "type their name" lyric preview, price and discount badge, sample song players, offer box, perks, how it works, reaction photos, reviews, comparison table, story, FAQs, footer, and a sticky mobile CTA. Every "Create their song" button opens the popup. |
| **Order popup** | The steps are built from the fields you set in the dashboard. It saves the customer's progress in their browser, checks each field, shows a review screen, then opens Razorpay. |
| **Payments** | The server sets the price, so the browser can't change it. The Razorpay signature is checked on the server. A webhook (`/api/razorpay/webhook`) marks orders paid even if the buyer closes the tab. |
| **Dashboard → Orders** | Revenue and today stats, search, filters (paid, unpaid/abandoned, delivery status, dates), full form answers, a WhatsApp click-to-chat button, delivery status, song link, notes, and CSV export. It refreshes every 30 s. |
| **Dashboard → Form Builder** | Add, edit, hide, reorder or delete form fields. Types: short or long text, phone, email, number, date, dropdown, single-choice buttons and choice chips (single or multiple). Fields with the same **Step** name appear on one popup screen. |
| **Dashboard → Page Content** | Upload the hero image or video, sample songs (mp3 plus cover), reaction photos, delivery screenshots, reviews and FAQs. Empty sections are hidden on the site. |
| **Dashboard → Settings** | Price, compare-at price, brand name, logo, announcement bar, contact details, Instagram, and policy pages (Privacy, Terms, Refund, Shipping, Contact), which Razorpay requires. |

## Run locally

```bash
npm install
copy .env.example .env      # then edit .env (Windows: copy, Mac/Linux: cp)
npm start
```

If `MONGODB_URI` is empty, the app starts a **temporary in-memory MongoDB**. That's handy for trying it out, but **all data is lost on restart**. With `DEMO_PAYMENTS=true` and no Razorpay keys, checkout shows a "Simulate successful payment" button, so you can test the whole flow without paying.

Dashboard logins are stored in MongoDB (`admins` collection, passwords hashed with scrypt).
- On first start, if there are no admins, one is created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`. After that, changing `.env` does **not** change the login.
- Add an admin, or reset a password: `npm run seed:admin -- <id> <password>` (min 8 characters). A reset logs out that admin's open sessions.
- List admins: `npm run seed:admin -- --list` · Remove one: `npm run seed:admin -- --delete <id>`

These commands need a real `MONGODB_URI`, because the in-memory dev database is wiped on every restart.

### Client preview content
With `DEMO_CONTENT=true`, the first start fills the page with preview content:
- free Unsplash stock photos (hero, sample-song covers, reactions, story image)
- 4 instrumental demo tracks from `public/demo/`, made by `scripts/make-demo-audio.js`
- 4 reviews marked "(sample)"

**Before going live**, set `DEMO_CONTENT=false`. Then replace every photo, song and review in Dashboard → Page Content with the client's real ones. Delete the sample reviews.

## Go live

1. **MongoDB**: create a free cluster at https://cloud.mongodb.com, add a database user, and allow your server's IP under Network Access. Then put the connection string in `MONGODB_URI`.
2. **Razorpay**: sign up at https://dashboard.razorpay.com and complete KYC.
   - Enter your API keys in **Dashboard → Settings → Payment gateway**. Use `rzp_test_…` keys first, then `rzp_live_…`. The keys are checked with Razorpay before saving and stored encrypted (using `JWT_SECRET`, so if you change `JWT_SECRET`, enter the keys again). You can also put them in `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `.env`; keys saved in the dashboard take priority.
   - Under Webhooks, add `https://YOUR-DOMAIN/api/razorpay/webhook` with the events `payment.captured`, `payment.failed` and `order.paid`. Enter its secret in the same dashboard card (or `RAZORPAY_WEBHOOK_SECRET`).
3. Set `NODE_ENV=production`, a strong `ADMIN_PASSWORD`, and a long random `JWT_SECRET`. Demo payments switch off automatically in production.
4. In the dashboard, fill in your brand, contact details and policy pages. Then upload your images, videos and sample songs.
5. Host on any Node.js host: Hostinger VPS or Node hosting, Render, Railway, or a VPS with PM2 and Nginx. Use HTTPS.
   - Back up the `uploads/` folder, which holds your uploaded media.
   - On hosts without persistent disk (Render free, Railway), uploads disappear on redeploy. Use a VPS, or paste media URLs from a CDN into the dashboard fields.

## Project structure

```
server/
  index.js            Express app
  db.js               MongoDB connection
  defaults.js         Default form fields, FAQs and policy templates (seeded on first run)
  models/             Order, FormField, Settings
  routes/public.js    /api/config, create order, verify payment, demo pay
  routes/admin.js     Dashboard API (auth, orders, fields, settings, uploads, CSV)
  routes/webhook.js   Razorpay webhook
public/
  index.html, css/, js/app.js     Landing page + popup + checkout
  policy.html                     Policy pages (/policy?p=refund …)
  admin/                          Dashboard
uploads/              Media uploaded from the dashboard
```
