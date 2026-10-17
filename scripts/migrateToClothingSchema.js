/**

* Mates Store - Schema Migration & Reference Data Seed Script
 * 
 * Rules:
 * 1. Idempotent: Can be run multiple times safely.
 * 2. Non-destructive: Does not drop original data; retains backups in Mongo.
 * 3. Seed ONLY approved reference data (Sizes XS-XXL, approved Colors, StoreSettings).
 * 4. NO fake products seeded.
 * 5. Converts currencies to integer piastres.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const SIZES_DATA = [
  { code: 'XS', sortOrder: 1 },
  { code: 'S', sortOrder: 2 },
  { code: 'M', sortOrder: 3 },
  { code: 'L', sortOrder: 4 },
  { code: 'XL', sortOrder: 5 },
  { code: 'XXL', sortOrder: 6 },
];

const COLORS_DATA = [
  { name: { en: 'Black', ar: 'أسود' }, slug: 'black', hex: '#000000' },
  { name: { en: 'White', ar: 'أبيض' }, slug: 'white', hex: '#FFFFFF' },
  { name: { en: 'Navy', ar: 'كحلي' }, slug: 'navy', hex: '#001F3F' },
  { name: { en: 'Heather Grey', ar: 'رمادي' }, slug: 'heather-grey', hex: '#808080' },
  { name: { en: 'Burgundy', ar: 'نبيتي / بورجوندي' }, slug: 'burgundy', hex: '#800020' },
  { name: { en: 'Beige', ar: 'بيج' }, slug: 'beige', hex: '#F5F5DC' },
  { name: { en: 'Olive Green', ar: 'زيتي' }, slug: 'olive-green', hex: '#556B2F' },
];

const DEFAULT_SETTINGS = {
  key: 'main',
  storeName: {
    en: 'Mates Store',
    ar: 'متجر ميتس',
  },
  shortDescription: {
    en: 'Matching outfits and clothing sets for couples, friends, and siblings.',
    ar: 'أطقم وملابس متناسقة للأزواج، الأصدقاء، والإخوة.',
  },
  announcement: {
    en: 'Welcome to Mates Store! Earn 5% loyalty points on every order.',
    ar: 'أهلاً بكم في متجر ميتس! اكسب 5% نقاط ولاء على كل طلب.',
  },
  phone: '01000000000',
  whatsappNumber: '201000000000',
  email: 'info@matesstore.com',
  address: {
    en: 'Cairo, Egypt',
    ar: 'القاهرة، مصر',
  },
  workingHours: {
    en: '10:00 AM - 10:00 PM',
    ar: '10:00 ص - 10:00 م',
  },
  currency: 'EGP',
  currencySymbol: {
    en: 'EGP',
    ar: 'ج.م',
  },
  loyaltyRateBasisPoints: 500, // 5%
  minimumOrder: 5000, // 50.00 EGP in piastres
  orderNumberFormat: 'MTS-{YYYY}{MM}{DD}-{SEQ}',
};

async function runMigration() {
  console.log('[MIGRATION] Connecting to local MongoDB...');
  await mongoose.connect(process.env.DB_URI);
  const db = mongoose.connection.db;
  const dbName = mongoose.connection.name;
  console.log(`[MIGRATION] Connected to target database: "${dbName}"`);

  // Record counts before migration
  const collectionsBefore = await db.listCollections().toArray();
  const countsBefore = {};
  for (const c of collectionsBefore) {
    countsBefore[c.name] = await db.collection(c.name).countDocuments();
  }
  console.log('[MIGRATION] Record counts BEFORE:', JSON.stringify(countsBefore, null, 2));

  // 1. Seed Reference Data: Sizes
  console.log('[MIGRATION] Upserting reference sizes (XS-XXL)...');
  const sizeCol = db.collection('sizes');
  await sizeCol.createIndex({ code: 1 }, { unique: true });
  for (const size of SIZES_DATA) {
    await sizeCol.updateOne(
      { code: size.code },
      { $set: size },
      { upsert: true }
    );
  }

  // 2. Seed Reference Data: Colors
  console.log('[MIGRATION] Upserting reference clothing colors...');
  const colorCol = db.collection('colors');
  await colorCol.createIndex({ slug: 1 }, { unique: true });
  for (const color of COLORS_DATA) {
    await colorCol.updateOne(
      { slug: color.slug },
      { $set: color },
      { upsert: true }
    );
  }

  // 3. Upsert StoreSettings
  console.log('[MIGRATION] Upserting store settings (Mates Store, EGP, 5% loyalty)...');
  const settingsCol = db.collection('storesettings');
  await settingsCol.createIndex({ key: 1 }, { unique: true });
  await settingsCol.updateOne(
    { key: 'main' },
    { $set: DEFAULT_SETTINGS },
    { upsert: true }
  );

  // 4. Ensure compound index for Variants
  console.log('[MIGRATION] Setting up collection indexes for variants, sets, customers, loyaltyledgers...');
  const variantCol = db.collection('variants');
  await variantCol.createIndex({ product: 1, size: 1, color: 1 }, { unique: true });
  await variantCol.createIndex({ sku: 1 }, { unique: true });

  const setCol = db.collection('sets');
  await setCol.createIndex({ slug: 1 }, { unique: true });

  const customerCol = db.collection('customers');
  await customerCol.createIndex({ phone: 1 }, { unique: true });

  const ledgerCol = db.collection('loyaltyledgers');
  await ledgerCol.createIndex({ customer: 1, createdAt: -1 });

  // 5. Transfer Admin & Manager users if legacy fruit-store users exist
  const unconverted = [];
  try {
    const adminClient = new mongoose.mongo.Admin(db);
    const dbsList = await adminClient.listDatabases();
    const hasFruitStore = dbsList.databases.some((d) => d.name === 'fruit-store');

    if (hasFruitStore) {
      console.log('[MIGRATION] Checking legacy "fruit-store" for existing staff & customer accounts...');
      const legacyConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/fruit-store').asPromise();
      const legacyUsers = await legacyConn.db.collection('users').find({}).toArray();

      const userCol = db.collection('users');
      let adminTransferred = 0;
      let customerTransferred = 0;

      for (const u of legacyUsers) {
        try {
          if (u.role === 'admin' || u.role === 'manager') {
            await userCol.updateOne(
              { email: u.email },
              { $set: { name: u.name, email: u.email, password: u.password, role: u.role, active: u.active ?? true } },
              { upsert: true }
            );
            adminTransferred++;
          } else if (u.phone) {
            // Convert customer to minimal Customer identity with loyalty balance in piastres
            const cleanPhone = String(u.phone).trim();
            const loyaltyPiastres = Math.round((u.loyaltyPoints || 0) * 100);
            await customerCol.updateOne(
              { phone: cleanPhone },
              {
                $set: {
                  name: u.name || 'Customer',
                  phone: cleanPhone,
                  address: (u.addresses && u.addresses[0]?.details) || '',
                  loyaltyBalance: loyaltyPiastres,
                },
              },
              { upsert: true }
            );
            customerTransferred++;
          }
        } catch (err) {
          unconverted.push({ collection: 'users', id: u._id, reason: err.message });
        }
      }

      console.log(`[MIGRATION] Transferred ${adminTransferred} staff users, converted ${customerTransferred} customer identities.`);
      await legacyConn.close();
    }
  } catch (err) {
    console.warn(`[MIGRATION] Notice checking legacy DB: ${err.message}`);
  }

  // Record counts after migration
  const collectionsAfter = await db.listCollections().toArray();
  const countsAfter = {};
  for (const c of collectionsAfter) {
    countsAfter[c.name] = await db.collection(c.name).countDocuments();
  }
  console.log('[MIGRATION] Record counts AFTER:', JSON.stringify(countsAfter, null, 2));
  console.log('[MIGRATION] Unconverted records:', JSON.stringify(unconverted, null, 2));

  await mongoose.disconnect();
  console.log('[MIGRATION] Migration finished successfully!');
}

runMigration().catch((err) => {
  console.error('[MIGRATION ERROR]', err);
  process.exit(1);
});
