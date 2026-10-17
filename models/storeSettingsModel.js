const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    storeName: {
      en: { type: String, default: 'Mates Store' },
      ar: { type: String, default: 'متجر ميتس' },
    },
    shortDescription: {
      en: { type: String, default: 'Matching outfits and clothing sets for couples, friends, and siblings.' },
      ar: { type: String, default: 'أطقم وملابس متناسقة للأزواج، الأصدقاء، والإخوة.' },
    },
    announcement: {
      en: { type: String, default: 'Welcome to Mates Store! Earn 5% loyalty points on every order.' },
      ar: { type: String, default: 'أهلاً بكم في متجر ميتس! اكسب 5% نقاط ولاء على كل طلب.' },
    },
    phone: { type: String, default: '01000000000' },
    whatsappNumber: { type: String, default: '201000000000' },
    email: { type: String, default: 'info@matesstore.com', lowercase: true },
    address: {
      en: { type: String, default: 'Cairo, Egypt' },
      ar: { type: String, default: 'القاهرة، مصر' },
    },
    workingHours: {
      en: { type: String, default: '10:00 AM - 10:00 PM' },
      ar: { type: String, default: '10:00 ص - 10:00 م' },
    },
    currency: { type: String, default: 'EGP' },
    currencySymbol: {
      en: { type: String, default: 'EGP' },
      ar: { type: String, default: 'ج.م' },
    },
    loyaltyRateBasisPoints: {
      type: Number,
      default: 500, // 500 basis points = 5.00%
      min: 0,
      max: 10000,
    },
    minimumOrder: {
      type: Number,
      default: 0, // In piastres
      min: 0,
    },
    orderNumberFormat: { type: String, default: 'MTS-{YYYY}{MM}{DD}-{SEQ}' },
    instagram: { type: String, trim: true, default: '' },
    facebook: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
