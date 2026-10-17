/**
 * Automated API Integration Test for Qasem E-Commerce Backend
 * Using native fetch in Node 22
 */

const BASE_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING AUTOMATED API INTEGRATION TESTS');
  console.log('==================================================\n');

  let customerToken = '';
  const customerEmail = `cust_test_${Date.now()}@test.com`;
  const customerPassword = 'password123';
  let adminToken = '';
  let testProductId = '';
  let testCategoryId = '';
  let cartItemId = '';
  let firstOrderId = '';
  let earnedPoints = 0;

  try {
    // --------------------------------------------------
    // 1. REGISTER
    // --------------------------------------------------
    console.log('Step 1: Registering a new customer...');
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Test Customer',
        email: customerEmail,
        password: customerPassword,
        passwordConfirm: customerPassword,
        role: 'user'
      })
    });
    
    if (signupRes.status !== 201) {
      throw new Error(`Signup failed with status ${signupRes.status}: ${await signupRes.text()}`);
    }
    await signupRes.json();
    console.log('✔ Signup successful!');
    
    // --------------------------------------------------
    // 2. LOGIN
    // --------------------------------------------------
    console.log('\nStep 2: Logging in as the new customer...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        password: customerPassword
      })
    });
    
    if (loginRes.status !== 200) {
      throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
    }
    const loginData = await loginRes.json();
    customerToken = loginData.token;
    console.log('✔ Login successful! Obtained customer JWT.');

    // --------------------------------------------------
    // 3. GET PROFILE
    // --------------------------------------------------
    console.log('\nStep 3: Getting customer profile...');
    const profileRes = await fetch(`${BASE_URL}/users/getMe`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    
    if (profileRes.status !== 200) {
      throw new Error(`Get profile failed with status ${profileRes.status}`);
    }
    const profileData = await profileRes.json();
    if (profileData.data.email !== customerEmail) {
      throw new Error('Profile email mismatch');
    }
    console.log('✔ Profile retrieved correctly.');

    // --------------------------------------------------
    // 4. CATEGORIES - List Categories
    // --------------------------------------------------
    console.log('\nStep 4: Listing categories...');
    const catRes = await fetch(`${BASE_URL}/categories`);
    if (catRes.status !== 200) {
      throw new Error(`List categories failed with status ${catRes.status}`);
    }
    const catData = await catRes.json();
    if (!catData.data || catData.data.length === 0) {
      throw new Error('No categories found in the database');
    }
    console.log(`✔ Categories listed successfully (found ${catData.data.length} categories).`);

    // --------------------------------------------------
    // 5. PRODUCTS - List Products & Product Details
    // --------------------------------------------------
    console.log('\nStep 5: Listing products...');
    const prodRes = await fetch(`${BASE_URL}/products`);
    if (prodRes.status !== 200) {
      throw new Error(`List products failed with status ${prodRes.status}`);
    }
    const prodData = await prodRes.json();
    if (!prodData.data || prodData.data.length === 0) {
      throw new Error('No products found in the database');
    }
    testProductId = prodData.data[0]._id;
    console.log(`✔ Products listed successfully (found ${prodData.data.length} products).`);

    console.log(`Step 5b: Getting product details for ID: ${testProductId}...`);
    const detailsRes = await fetch(`${BASE_URL}/products/${testProductId}`);
    if (detailsRes.status !== 200) {
      throw new Error(`Get product details failed with status ${detailsRes.status}`);
    }
    const detailsData = await detailsRes.json();
    console.log(`✔ Product details retrieved for: ${detailsData.data.name}`);

    // --------------------------------------------------
    // 6. WISHLIST - Add, Get, Remove
    // --------------------------------------------------
    console.log('\nStep 6: Adding product to wishlist...');
    const wishAddRes = await fetch(`${BASE_URL}/wishlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ productId: testProductId })
    });
    if (wishAddRes.status !== 200) {
      throw new Error(`Add to wishlist failed with status ${wishAddRes.status}`);
    }
    console.log('✔ Product added to wishlist.');

    console.log('Step 6b: Getting wishlist...');
    const wishGetRes = await fetch(`${BASE_URL}/wishlist`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (wishGetRes.status !== 200) {
      throw new Error(`Get wishlist failed with status ${wishGetRes.status}`);
    }
    const wishGetData = await wishGetRes.json();
    const isProductInWishlist = wishGetData.data.some((item) => (item._id || item) === testProductId);
    if (!isProductInWishlist) {
      throw new Error('Product not found in wishlist response');
    }
    console.log('✔ Wishlist contains the product.');

    console.log('Step 6c: Removing product from wishlist...');
    const wishRemoveRes = await fetch(`${BASE_URL}/wishlist/${testProductId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (wishRemoveRes.status !== 200) {
      throw new Error(`Remove from wishlist failed with status ${wishRemoveRes.status}`);
    }
    console.log('✔ Product removed from wishlist.');

    // --------------------------------------------------
    // 7. CART - Add Product, Get, Update, Remove
    // --------------------------------------------------
    console.log('\nStep 7: Adding product to cart...');
    const cartAddRes = await fetch(`${BASE_URL}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ productId: testProductId })
    });
    if (cartAddRes.status !== 200) {
      throw new Error(`Add to cart failed with status ${cartAddRes.status}`);
    }
    const cartAddData = await cartAddRes.json();
    cartItemId = cartAddData.data.cartItems[0]._id;
    console.log(`✔ Product added to cart (Item ID: ${cartItemId}).`);

    console.log('Step 7b: Getting cart...');
    const cartGetRes = await fetch(`${BASE_URL}/cart`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (cartGetRes.status !== 200) {
      throw new Error(`Get cart failed with status ${cartGetRes.status}`);
    }
    console.log('✔ Cart retrieved successfully.');

    console.log('Step 7c: Updating cart item quantity to 3...');
    const cartUpdateRes = await fetch(`${BASE_URL}/cart/${cartItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ quantity: 3 })
    });
    if (cartUpdateRes.status !== 200) {
      throw new Error(`Update cart failed with status ${cartUpdateRes.status}`);
    }
    const cartUpdateData = await cartUpdateRes.json();
    const updatedItem = cartUpdateData.data.cartItems.find(i => i._id === cartItemId);
    if (updatedItem.quantity !== 3) {
      throw new Error(`Cart item quantity mismatch, expected 3, got: ${updatedItem.quantity}`);
    }
    console.log('✔ Cart item quantity updated.');

    console.log('Step 7d: Removing item from cart...');
    const cartRemoveRes = await fetch(`${BASE_URL}/cart/${cartItemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (cartRemoveRes.status !== 200) {
      throw new Error(`Remove cart item failed with status ${cartRemoveRes.status}`);
    }
    console.log('✔ Item removed from cart.');

    // --------------------------------------------------
    // 8. LOYALTY POINTS & ORDERS (Earning & Redemption Flow)
    // --------------------------------------------------
    console.log('\nStep 8: Testing Loyalty points earning flow...');
    // First, add the product back to the cart
    await fetch(`${BASE_URL}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ productId: testProductId })
    });
    
    // Check cart again to make sure it has the item and get subtotal
    const tempCartRes = await fetch(`${BASE_URL}/cart`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const tempCartData = await tempCartRes.json();
    const cartPrice = tempCartData.data.totalCartPrice;

    const orderCreateRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        customerName: 'Integration Test Customer',
        phone: '01116596635',
        address: '123 Ramallah Orchard Road',
        taxPrice: 2,
        shippingPrice: 5
      })
    });
    if (orderCreateRes.status !== 201) {
      throw new Error(`Create order failed with status ${orderCreateRes.status}: ${await orderCreateRes.text()}`);
    }
    const orderCreateData = await orderCreateRes.json();
    firstOrderId = orderCreateData.data._id;
    ({ earnedPoints } = orderCreateData.data);

    const ordersRes = await fetch(`${BASE_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (ordersRes.status !== 200) {
      throw new Error(`Get orders list failed with status ${ordersRes.status}`);
    }

    const orderDetailsRes = await fetch(`${BASE_URL}/orders/${firstOrderId}`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (orderDetailsRes.status !== 200) {
      throw new Error(`Get order details failed with status ${orderDetailsRes.status}`);
    }

    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'Admin@123'
      })
    });
    if (adminLoginRes.status !== 200) {
      throw new Error(`Admin login failed with status ${adminLoginRes.status}`);
    }
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;

    const orderStatusRes = await fetch(`${BASE_URL}/orders/${firstOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'completed' })
    });
    if (orderStatusRes.status !== 200) {
      throw new Error(`Admin update order status failed with status ${orderStatusRes.status}`);
    }
    console.log('✔ Order status updated to completed. Points should be awarded.');

    console.log('\nStep 9c: Checking customer profile for loyalty points...');
    const updatedProfileRes = await fetch(`${BASE_URL}/users/getMe`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const updatedProfileData = await updatedProfileRes.json();
    const finalPoints = updatedProfileData.data.loyaltyPoints || 0;
    console.log(`✔ Customer loyalty points balance: ${finalPoints} points (expected: ${earnedPoints} points).`);

    if (finalPoints !== earnedPoints) {
      throw new Error(`Loyalty points mismatch, expected: ${earnedPoints}, got: ${finalPoints}`);
    }

    if (finalPoints > 0) {
      console.log('\nStep 9d: Testing loyalty points redemption in checkout...');
      // 1. Add product to cart again
      await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ productId: testProductId })
      });
      // 2. Checkout with points redemption
      const redeemRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          customerName: 'Integration Test Customer',
          phone: '01116596635',
          address: '123 Ramallah Orchard Road',
          taxPrice: 2,
          shippingPrice: 5,
          redeemPoints: finalPoints
        })
      });
      if (redeemRes.status !== 201) {
        throw new Error(`Checkout with points redemption failed with status ${redeemRes.status}: ${await redeemRes.text()}`);
      }
      const redeemData = await redeemRes.json();
      console.log(`✔ Order placed with points redemption! Discount applied: ${redeemData.data.loyaltyDiscount} ₪.`);
    }

    // --------------------------------------------------
    // 10. ADMIN CRUD OPERATIONS
    // --------------------------------------------------
    const uniqueId = Date.now();
    const tempCategoryName = `Admin Cat ${uniqueId}`;
    const tempCategoryUpdatedName = `Admin Cat ${uniqueId} Updated`;
    const tempProductName = `Admin Product ${uniqueId}`;

    console.log('\nStep 10: Admin Category CRUD...');
    const createCatRes = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: tempCategoryName })
    });
    if (createCatRes.status !== 201) {
      throw new Error(`Admin create category failed with status ${createCatRes.status}`);
    }
    const createCatData = await createCatRes.json();
    testCategoryId = createCatData.data._id;
    console.log(`✔ Category created successfully! ID: ${testCategoryId}`);

    console.log(`Step 10b: Admin updating category ID: ${testCategoryId}...`);
    const updateCatRes = await fetch(`${BASE_URL}/categories/${testCategoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: tempCategoryUpdatedName })
    });
    if (updateCatRes.status !== 200) {
      throw new Error(`Admin update category failed with status ${updateCatRes.status}`);
    }
    console.log('✔ Category updated.');

    console.log('\nStep 10c: Admin Product CRUD...');
    const createProdRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: tempProductName,
        name: tempProductName,
        quantity: 30,
        price: 15,
        originalPrice: 15,
        category: testCategoryId,
        image: 'melon.jpeg',
        imageCover: 'melon.jpeg'
      })
    });
    if (createProdRes.status !== 201) {
      throw new Error(`Admin create product failed with status ${createProdRes.status}: ${await createProdRes.text()}`);
    }
    const createProdData = await createProdRes.json();
    const adminProductId = createProdData.data._id;
    console.log(`✔ Product created successfully! ID: ${adminProductId}`);

    console.log(`Step 10d: Admin updating product ID: ${adminProductId}...`);
    const updateProdRes = await fetch(`${BASE_URL}/products/${adminProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ quantity: 25 })
    });
    if (updateProdRes.status !== 200) {
      throw new Error(`Admin update product failed with status ${updateProdRes.status}`);
    }
    console.log('✔ Product updated.');

    console.log(`Step 10e: Admin adding discount to product ID: ${adminProductId}...`);
    const addDiscountRes = await fetch(`${BASE_URL}/products/${adminProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ discountPercentage: 20 })
    });
    if (addDiscountRes.status !== 200) {
      throw new Error(`Admin add discount failed with status ${addDiscountRes.status}`);
    }
    const addDiscountData = await addDiscountRes.json();
    console.log(`✔ Discount added. Discounted Price: ${addDiscountData.data.discountedPrice} ₪ (expected 12 ₪).`);
    if (addDiscountData.data.discountedPrice !== 12) {
      throw new Error('Discounted price calculation mismatch');
    }

    console.log(`Step 10f: Admin removing discount from product ID: ${adminProductId}...`);
    const removeDiscountRes = await fetch(`${BASE_URL}/products/${adminProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ discountPercentage: 0 })
    });
    if (removeDiscountRes.status !== 200) {
      throw new Error(`Admin remove discount failed with status ${removeDiscountRes.status}`);
    }
    const removeDiscountData = await removeDiscountRes.json();
    console.log(`✔ Discount removed. Price: ${removeDiscountData.data.discountedPrice} ₪ (expected 15 ₪).`);
    if (removeDiscountData.data.discountedPrice !== 15) {
      throw new Error('Discount removal price mismatch');
    }

    console.log(`Step 10g: Admin deleting product ID: ${adminProductId}...`);
    const deleteProdRes = await fetch(`${BASE_URL}/products/${adminProductId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (deleteProdRes.status !== 204) {
      throw new Error(`Admin delete product failed with status ${deleteProdRes.status}`);
    }
    console.log('✔ Product deleted.');

    console.log(`Step 10h: Admin deleting category ID: ${testCategoryId}...`);
    const deleteCatRes = await fetch(`${BASE_URL}/categories/${testCategoryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (deleteCatRes.status !== 204) {
      throw new Error(`Admin delete category failed with status ${deleteCatRes.status}`);
    }
    console.log('✔ Category deleted.');

    console.log('\n==================================================');
    console.log('✔ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✔');
    console.log('==================================================');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST RUN FAILED:');
    console.error(error.message);
    console.log('==================================================');
    process.exit(1);
  }
}

runTests();
