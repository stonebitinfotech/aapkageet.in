const mongoose = require('mongoose');

let memServer = null;

async function connectDB() {
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is required in production. Add it to your .env file.');
    }
    let MongoMemoryServer;
    try {
      ({ MongoMemoryServer } = require('mongodb-memory-server'));
    } catch {
      throw new Error(
        'MONGODB_URI is empty. Either set MONGODB_URI in .env (MongoDB Atlas / local MongoDB) ' +
        'or run "npm install mongodb-memory-server" to use a temporary dev database.'
      );
    }
    memServer = await MongoMemoryServer.create({ instance: { launchTimeout: 90000 } });
    uri = memServer.getUri('songs');
    console.warn('\n⚠  No MONGODB_URI set -using a TEMPORARY in-memory MongoDB. Data is lost on restart.\n');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('✓ MongoDB connected');
}

async function closeDB() {
  await mongoose.disconnect();
  if (memServer) await memServer.stop();
}

module.exports = { connectDB, closeDB };
