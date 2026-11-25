// Add an admin login to the database, or reset the password of an existing one.
//   npm run seed:admin -- <username> <password>
//   npm run seed:admin -- --list            (show admin usernames)
//   npm run seed:admin -- --delete <username>
// With no arguments, uses ADMIN_USERNAME / ADMIN_PASSWORD from .env.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../server/models/Admin');

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is empty in .env. The in-memory dev database is wiped on restart, so admins can only be seeded into a real MongoDB.');
  }
  const args = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI);

  if (args[0] === '--list') {
    const admins = await Admin.find().sort({ createdAt: 1 }).lean();
    if (!admins.length) console.log('No admins yet.');
    admins.forEach((a) => console.log(`- ${a.username}  (last login: ${a.lastLoginAt ? a.lastLoginAt.toISOString() : 'never'})`));
    return;
  }

  if (args[0] === '--delete') {
    const name = String(args[1] || '').trim().toLowerCase();
    if (!name) throw new Error('Usage: npm run seed:admin -- --delete <username>');
    if ((await Admin.countDocuments()) <= 1) throw new Error('Refusing to delete the last admin.');
    const r = await Admin.deleteOne({ username: name });
    console.log(r.deletedCount ? `✓ Deleted admin "${name}"` : `No admin named "${name}"`);
    return;
  }

  const username = args[0] || process.env.ADMIN_USERNAME;
  const password = args[1] || (args[0] ? '' : process.env.ADMIN_PASSWORD);
  if (!username || !password) throw new Error('Usage: npm run seed:admin -- <username> <password>');

  const { admin, created } = await Admin.upsertAdmin(username, password);
  console.log(created ? `✓ Created admin "${admin.username}"` : `✓ Password reset for admin "${admin.username}" (existing sessions logged out)`);
}

main()
  .catch((e) => { console.error('✗ ' + e.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
