/**
 * Backup Script for Mates Store Local MongoDB
 * Dumps local collections into local JSON files and creates MongoDB in-database backup collections.
 * Does not expose or print DB_URI or credentials.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`[BACKUP] Starting database backup into: ${backupDir}`);

  // 1. Connect to current configured database
  await mongoose.connect(process.env.DB_URI);
  const currentDb = mongoose.connection.db;
  const currentDbName = mongoose.connection.name;
  console.log(`[BACKUP] Connected to current database: "${currentDbName}"`);

  const currentCollections = await currentDb.listCollections().toArray();
  const report = { currentDb: currentDbName, collections: {} };

  for (const col of currentCollections) {
    if (col.name.includes('_backup_')) continue;
    const docs = await currentDb.collection(col.name).find({}).toArray();
    fs.writeFileSync(
      path.join(backupDir, `${currentDbName}_${col.name}.json`),
      JSON.stringify(docs, null, 2)
    );

    // Also clone in-database backup collection if it has records
    if (docs.length > 0) {
      const backupColName = `${col.name}_backup_${timestamp}`;
      await currentDb.collection(backupColName).insertMany(docs);
    }
    report.collections[col.name] = docs.length;
    console.log(`[BACKUP] Dumped ${docs.length} records from collection "${col.name}"`);
  }

  // 2. Also check if legacy "fruit-store" exists on the same local MongoDB host
  try {
    const admin = new mongoose.mongo.Admin(currentDb);
    const dbsResult = await admin.listDatabases();
    const hasFruitStore = dbsResult.databases.some((d) => d.name === 'fruit-store');

    if (hasFruitStore && currentDbName !== 'fruit-store') {
      console.log(`[BACKUP] Legacy "fruit-store" detected. Backing up legacy database records...`);
      const fruitConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/fruit-store').asPromise();
      const fruitCollections = await fruitConn.db.listCollections().toArray();
      report.legacyDb = 'fruit-store';
      report.legacyCollections = {};

      for (const col of fruitCollections) {
        if (col.name.includes('_backup_')) continue;
        const docs = await fruitConn.db.collection(col.name).find({}).toArray();
        fs.writeFileSync(
          path.join(backupDir, `fruit-store_${col.name}.json`),
          JSON.stringify(docs, null, 2)
        );
        report.legacyCollections[col.name] = docs.length;
        console.log(`[BACKUP] Dumped ${docs.length} records from legacy "fruit-store.${col.name}"`);
      }
      await fruitConn.close();
    }
  } catch (err) {
    console.warn(`[BACKUP] Notice: could not check legacy databases: ${err.message}`);
  }

  await mongoose.disconnect();

  fs.writeFileSync(path.join(backupDir, 'backup-summary.json'), JSON.stringify(report, null, 2));
  console.log(`[BACKUP] Backup completed successfully! Summary saved to backup-summary.json`);
}

runBackup().catch((err) => {
  console.error(`[BACKUP ERROR] Backup failed: ${err.message}`);
  process.exit(1);
});
