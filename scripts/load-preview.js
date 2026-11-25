// Load the PREVIEW look (hero slides, sample songs, occasion photos, reaction photos, story image) into an
// EXISTING database — e.g. the live server, where DEMO_CONTENT only works on a brand-new database.
//
//   npm run load:preview                     fill only sections that are still empty
//   npm run load:preview -- --force          overwrite those sections even if you already edited them
//   npm run load:preview -- --include-reviews   also add the 6 "(sample)" reviews and the "5,000+ songs delivered" line
//
// Sample reviews and the stats line are NOT real customers/numbers. On a live shop, replace them with real ones
// (Dashboard → Page Content) as soon as you have them. They are added without the "Verified purchase" badge.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const Settings = require('../server/models/Settings');
const demo = require('../server/demoContent');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const REVIEWS = args.includes('--include-reviews');

const isEmpty = {
  heroSlides: (v) => !v || v.length === 0,
  samples: (v) => !v || v.length === 0,
  reactions: (v) => !v || v.length === 0,
  occasions: (v) => !v || v.length === 0 || v.every((o) => !o.image), // defaults have no photos
  storyImage: (v) => !v,
  testimonials: (v) => !v || v.length === 0,
  statsText: (v) => !v,
};

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is empty in .env');
  await mongoose.connect(process.env.MONGODB_URI);
  const s = await Settings.getMain();

  const keys = ['heroSlides', 'samples', 'occasions', 'reactions', 'storyImage'];
  if (REVIEWS) keys.push('testimonials', 'statsText');

  const changed = [];
  const skipped = [];
  for (const k of keys) {
    if (!(k in demo)) continue;
    if (!FORCE && !isEmpty[k](s[k])) { skipped.push(k); continue; }
    let value = demo[k];
    if (k === 'testimonials') value = value.map((t) => ({ ...t, verified: false }));
    s.set(k, value);
    changed.push(k);
  }
  await s.save();

  console.log(changed.length ? `✓ Loaded preview content: ${changed.join(', ')}` : 'Nothing to load.');
  if (skipped.length) console.log(`  Kept your existing: ${skipped.join(', ')} (use --force to replace)`);
  if (!REVIEWS) console.log('  Reviews/stats not added (sample reviews are not real). Add real ones in Dashboard → Page Content, or run with --include-reviews.');
  console.log('  Reload the website to see it. Replace stock photos and demo songs with your own in Dashboard → Page Content.');
}

main()
  .catch((e) => { console.error('✗ ' + e.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
