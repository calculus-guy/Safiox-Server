/**
 * Database Indexes Setup Script.
 *
 * Usage: node src/scripts/createIndexes.js
 *
 * Creates geospatial (2dsphere) and compound indexes for optimal query performance.
 * These indexes are also defined in the Mongoose schemas (via schema.index()),
 * but this script ensures they exist if the auto-index is disabled in production.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const createIndexes = async () => {
  try {
    console.log('📊 Creating database indexes...\n');
    await mongoose.connect(process.env.MONGO_URI);

    const db = mongoose.connection.db;

    // ── Users ──
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ lastLocation: '2dsphere' });
    console.log('  ✅ Users indexes');

    // ── Organizations ──
    await db.collection('organizations').createIndex({ location: '2dsphere' });
    await db.collection('organizations').createIndex({ type: 1, verificationStatus: 1 });
    await db.collection('organizations').createIndex({ userId: 1 }, { unique: true });
    console.log('  ✅ Organizations indexes');

    // ── Emergency Contacts ──
    await db.collection('emergencycontacts').createIndex({ userId: 1 });
    console.log('  ✅ Emergency Contacts indexes');

    // ── SOS Alerts ──
    await db.collection('sosalerts').createIndex({ userId: 1, status: 1 });
    await db.collection('sosalerts').createIndex({ trackingToken: 1 }, { unique: true });
    await db.collection('sosalerts').createIndex({ location: '2dsphere' });
    console.log('  ✅ SOS Alerts indexes');

    // ── Incidents ──
    await db.collection('incidents').createIndex({ organizationId: 1, status: 1 });
    await db.collection('incidents').createIndex({ userId: 1 });
    await db.collection('incidents').createIndex({ location: '2dsphere' });
    console.log('  ✅ Incidents indexes');

    // ── Community Responders ──
    await db.collection('communityresponders').createIndex({ userId: 1 }, { unique: true });
    await db.collection('communityresponders').createIndex({ location: '2dsphere' });
    await db.collection('communityresponders').createIndex({ available: 1 });
    console.log('  ✅ Community Responders indexes');

    // ── Community Alerts ──
    await db.collection('communityalerts').createIndex({ userId: 1, status: 1 });
    await db.collection('communityalerts').createIndex({ location: '2dsphere' });
    console.log('  ✅ Community Alerts indexes');

    // ── Feed Posts ──
    await db.collection('feedposts').createIndex({ authorId: 1, createdAt: -1 });
    await db.collection('feedposts').createIndex({ isRemoved: 1, createdAt: -1 });
    await db.collection('feedposts').createIndex({ content: 'text' });
    console.log('  ✅ Feed Posts indexes');

    // ── Comments ──
    await db.collection('comments').createIndex({ postId: 1, createdAt: -1 });
    console.log('  ✅ Comments indexes');

    // ── Follows ──
    await db.collection('follows').createIndex(
      { followerId: 1, followingId: 1 },
      { unique: true }
    );
    console.log('  ✅ Follows indexes');

    // ── Messages ──
    await db.collection('messages').createIndex({ conversationKey: 1, createdAt: -1 });
    await db.collection('messages').createIndex({ senderId: 1 });
    await db.collection('messages').createIndex({ receiverId: 1 });
    console.log('  ✅ Messages indexes');

    // ── Notifications ──
    await db.collection('notifications').createIndex({ userId: 1, read: 1, createdAt: -1 });
    console.log('  ✅ Notifications indexes');

    // ── Staff ──
    await db.collection('staff').createIndex({ organizationId: 1 });
    console.log('  ✅ Staff indexes');

    // ── Fleet Units ──
    await db.collection('fleetunits').createIndex({ organizationId: 1, status: 1 });
    console.log('  ✅ Fleet Units indexes');

    // ── Devices ──
    await db.collection('devices').createIndex({ userId: 1 });
    console.log('  ✅ Devices indexes');

    // ── Broadcasts ──
    await db.collection('broadcasts').createIndex({ organizationId: 1, createdAt: -1 });
    console.log('  ✅ Broadcasts indexes');

    console.log('\n✅ All indexes created successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Index creation failed:', err.message);
    process.exit(1);
  }
};

createIndexes();
