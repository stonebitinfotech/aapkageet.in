const FormField = require('./models/FormField');
const Settings = require('./models/Settings');
const Admin = require('./models/Admin');
const defaults = require('./defaults');

// First admin: created from ADMIN_USERNAME / ADMIN_PASSWORD only when the database has no admins yet.
// After that, the database is the source of truth. Add or reset admins with: npm run seed:admin -- <id> <password>
async function seedAdmin() {
  if ((await Admin.countDocuments()) > 0) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn('⚠  No admin account exists. Set ADMIN_PASSWORD in .env or run: npm run seed:admin -- <id> <password>');
    return;
  }
  try {
    await Admin.upsertAdmin(username, password);
    console.log(`✓ Seeded admin account "${username.toLowerCase()}" from .env`);
  } catch (e) {
    console.warn(`⚠  Could not seed admin from .env: ${e.message}`);
  }
}

async function ensureSeed() {
  await seedAdmin();

  if ((await FormField.countDocuments()) === 0) {
    await FormField.insertMany(defaults.fields.map((f, i) => ({ ...f, order: i })));
    console.log(`✓ Seeded ${defaults.fields.length} default form fields`);
  }

  const isNew = !(await Settings.exists({ key: 'main' }));
  const settings = await Settings.getMain();

  // Preview content (stock photos, demo songs, sample reviews) -only on first start, only if enabled
  if (isNew && process.env.DEMO_CONTENT === 'true') {
    settings.set(require('./demoContent'));
    await settings.save();
    console.log('✓ Loaded PREVIEW demo content (stock photos, demo songs, sample reviews) -replace before going live');
  }
}

module.exports = { ensureSeed };
