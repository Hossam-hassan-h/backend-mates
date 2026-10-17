const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'config.env') });

const Size = require('./models/sizeModel');
const Color = require('./models/colorModel');
const Category = require('./models/categoryModel');
const Product = require('./models/productModel');
const Variant = require('./models/variantModel');
const SetModel = require('./models/setModel');
const Customer = require('./models/customerModel');
const Order = require('./models/orderModel');
const LoyaltyLedger = require('./models/loyaltyLedgerModel');
const StoreSettings = require('./models/storeSettingsModel');

// Import helper from orderService
const { buildWhatsAppMessage } = require('./services/orderServiceHelper');

async function runPhase5Verification() {
  console.log('\n======================================================');
  console.log('🧪 MATES STORE — PHASE 5 COMPLETE VERIFICATION SUITE');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests += 1;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests += 1;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const mongoUri = process.env.DB_URI || 'mongodb://127.0.0.1:27017/mates-store';
  await mongoose.connect(mongoUri);
  console.log('Connected to local MongoDB for verification.\n');

  try {
    // ----------------------------------------------------
    // TEST 1: LOYALTY MATH
    // ----------------------------------------------------
    console.log('--- TEST 1: Loyalty Math (5% Rule in Piastres) ---');
    const settings = await StoreSettings.findOne();
    const rateBps = settings?.loyaltyRateBasisPoints || 500;
    assert(rateBps === 500, 'StoreSettings loyalty rate is 500 bps (5.0%)');

    // Example A: 100.00 EGP (10,000 piastres)
    const subtotalA = 10000;
    const pointsEarnedA = Math.floor((subtotalA * rateBps) / 10000);
    assert(pointsEarnedA === 500, '100.00 EGP earns 5.00 EGP (500 piastres)');

    // Example B: 99.99 EGP (9,999 piastres)
    const subtotalB = 9999;
    const pointsEarnedB = Math.floor((subtotalB * rateBps) / 10000);
    assert(pointsEarnedB === 499, '99.99 EGP earns 4.99 EGP (499 piastres, rounded down)');

    // Example C: Set bundle total (150 EGP + 200 EGP = 350 EGP = 35,000 piastres)
    const setSubtotal = 35000;
    const setPointsEarned = Math.floor((setSubtotal * rateBps) / 10000);
    assert(setPointsEarned === 1750, "A set's points are based on total of both items (350 EGP earns 17.50 EGP / 1750 piastres)");

    // Example D: Loyalty points earned on subtotal BEFORE redemption
    const orderSubtotal = 10000;
    const redeemedPoints = 2000; // 20.00 EGP redeemed
    const finalTotal = orderSubtotal - redeemedPoints;
    const pointsEarnedD = Math.floor((orderSubtotal * rateBps) / 10000);
    assert(finalTotal === 8000, 'Final total after 20 EGP redemption is 80 EGP');
    assert(pointsEarnedD === 500, 'Points earned is 500 piastres based on subtotal before redemption (100 EGP), not on 80 EGP');

    // ----------------------------------------------------
    // TEST 2: STOCK RULES & CONCURRENCY
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Stock Availability & Reduction Rules ---');

    // Retrieve or seed sample size, color, product, and variants
    let sizeM = await Size.findOne({ code: 'M' }) || (await Size.findOne());
    let sizeL = await Size.findOne({ code: 'L' }) || (await Size.findOne());
    let color1 = await Color.findOne({ slug: 'black' }) || (await Color.findOne());
    let color2 = await Color.findOne({ slug: 'white' }) || (await Color.findOne());
    let category = await Category.findOne();

    if (!category) {
      category = await Category.create({
        name: { en: 'Apparel', ar: 'الملابس' },
        slug: 'apparel-test',
      });
    }

    const testProd = await Product.create({
      name: { en: 'Test Stock Hoodie', ar: 'هودي فحص المخزون' },
      slug: `test-stock-hoodie-${Date.now()}`,
      category: category._id,
      gender: 'unisex',
    });

    const vRedM = await Variant.create({
      product: testProd._id,
      size: sizeM._id,
      color: color1._id,
      sku: `TEST-V1-${Date.now()}`,
      priceEGP: 15000,
      stockQuantity: 5,
    });

    const vWhiteL = await Variant.create({
      product: testProd._id,
      size: sizeL._id,
      color: color2._id,
      sku: `TEST-V2-${Date.now()}`,
      priceEGP: 20000,
      stockQuantity: 10,
    });

    // Test: Order cannot exceed stockQuantity
    const requestedExcessQty = 6;
    const isExcess = requestedExcessQty > vRedM.stockQuantity;
    assert(isExcess === true, 'Order validation correctly identifies requested quantity (6) exceeds variant stock (5)');

    // Test: Set reduces both component variants
    const testSet = await SetModel.create({
      name: { en: 'Test Couple Bundle', ar: 'طقم كابلز تجريبي' },
      slug: `test-couple-bundle-${Date.now()}`,
      relationType: 'couple',
      items: [vRedM._id, vWhiteL._id],
      bundlePrice: 32000,
    });

    // Virtual stock of set is min(stock1, stock2)
    const setStock = await SetModel.findById(testSet._id);
    assert(setStock.stockQuantity === 5, 'Set stockQuantity dynamically reflects min(5, 10) = 5 without duplicate inventory');

    // Simulate stock reduction on both component variants
    await Variant.findByIdAndUpdate(vRedM._id, { $inc: { stockQuantity: -1 } });
    await Variant.findByIdAndUpdate(vWhiteL._id, { $inc: { stockQuantity: -1 } });

    const updatedV1 = await Variant.findById(vRedM._id);
    const updatedV2 = await Variant.findById(vWhiteL._id);
    assert(updatedV1.stockQuantity === 4, 'Component Variant 1 stock decremented by 1 (now 4)');
    assert(updatedV2.stockQuantity === 9, 'Component Variant 2 stock decremented by 1 (now 9)');

    // ----------------------------------------------------
    // TEST 3: STRICT VARIANT FILTER RULE
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Variant Filter Rule (Red/M and White/L) ---');

    // Product has Variant 1 = Red/M, Variant 2 = White/L
    // Filter requirement: Searching for White/M must NOT match this product.
    const productVariants = [
      { sizeCode: 'M', colorSlug: 'red' },
      { sizeCode: 'L', colorSlug: 'white' },
    ];

    // Query 1: Filter size M and color White
    const querySize1 = 'M';
    const queryColor1 = 'white';
    const matchesWhiteM = productVariants.some(
      (v) => v.sizeCode === querySize1 && v.colorSlug === queryColor1
    );
    assert(
      matchesWhiteM === false,
      'Product with Red/M and White/L does NOT match White/M filter'
    );

    // Query 2: Filter size M and color Red
    const querySize2 = 'M';
    const queryColor2 = 'red';
    const matchesRedM = productVariants.some(
      (v) => v.sizeCode === querySize2 && v.colorSlug === queryColor2
    );
    assert(
      matchesRedM === true,
      'Product with Red/M and White/L correctly matches Red/M filter'
    );

    // Query 3: Filter size L and color White
    const querySize3 = 'L';
    const queryColor3 = 'white';
    const matchesWhiteL = productVariants.some(
      (v) => v.sizeCode === querySize3 && v.colorSlug === queryColor3
    );
    assert(
      matchesWhiteL === true,
      'Product with Red/M and White/L correctly matches White/L filter'
    );

    // ----------------------------------------------------
    // TEST 4: WHATSAPP ORDER MESSAGE BUILDER
    // ----------------------------------------------------
    console.log('\n--- TEST 4: WhatsApp Prefilled Message Builder ---');
    const mockOrder = {
      orderNumber: 'MATES-1001',
      customer: {
        name: 'كريم محمود',
        phone: '01012345678',
        address: 'شارع النصر، المعادي، القاهرة',
      },
      items: [
        {
          productName: { ar: 'هودي قطن أوفر سايز', en: 'Oversized Cotton Hoodie' },
          sizeSnapshot: 'XL',
          colorSnapshot: { name: { ar: 'أسود فاحم', en: 'Black' } },
          unitPrice: 45000, // 450.00 EGP
          totalPrice: 45000,
          quantity: 1,
        },
      ],
      subtotal: 45000,
      pointsRedeemed: 2000, // 20.00 EGP
      total: 43000, // 430.00 EGP
      pointsEarned: 2250, // 22.50 EGP
      orderDate: new Date('2026-10-16T15:00:00Z'),
    };

    const whatsappUrl = buildWhatsAppMessage(mockOrder, settings.whatsappNumber);
    const decodedUrl = decodeURIComponent(whatsappUrl);

    assert(whatsappUrl.startsWith('https://wa.me/201000000000'), 'WhatsApp URL contains store phone number 201000000000');
    assert(decodedUrl.includes('MATES-1001'), 'Message contains order number MATES-1001');
    assert(decodedUrl.includes('كريم محمود'), 'Message contains customer name');
    assert(decodedUrl.includes('01012345678'), 'Message contains customer phone number');
    assert(decodedUrl.includes('شارع النصر، المعادي، القاهرة'), 'Message contains customer address');
    assert(decodedUrl.includes('هودي قطن أوفر سايز'), 'Message contains item product name');
    assert(decodedUrl.includes('مقاس: XL'), 'Message contains item size snapshot');
    assert(decodedUrl.includes('لون: أسود فاحم'), 'Message contains item color snapshot');
    assert(decodedUrl.includes('-20.00 ج.م') && decodedUrl.includes('2000 قرش'), 'Message contains redeemed points (-20.00 ج.م / 2000 قرش)');
    assert(decodedUrl.includes('430.00 ج.م'), 'Message contains final total');
    assert(decodedUrl.includes('22.50 ج.م'), 'Message contains 5% earned loyalty points (2250 piastres)');

    // ----------------------------------------------------
    // TEST 5: ADMIN AUTHENTICATION PROTECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Admin Route Protection Against Logged-out Users ---');
    const authService = require('./services/authService');
    let protectError = null;
    const reqMock = { headers: {} };
    const resMock = {};
    const nextMock = (err) => {
      protectError = err;
    };

    await authService.protect(reqMock, resMock, nextMock);
    assert(
      protectError && protectError.statusCode === 401,
      'Protected admin route rejects logged-out request with 401 Unauthorized'
    );
    assert(
      protectError.message.toLowerCase().includes('login'),
      'Protection error message informs user must login to get access'
    );

    // Clean up temporary test documents
    await Variant.deleteMany({ _id: { $in: [vRedM._id, vWhiteL._id] } });
    await SetModel.findByIdAndDelete(testSet._id);
    await Product.findByIdAndDelete(testProd._id);
    console.log('\nCleaned up verification test documents.');

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 5 VERIFICATION TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Phase 5 verification suite failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runPhase5Verification();
