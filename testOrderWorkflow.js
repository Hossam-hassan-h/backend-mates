/**
 * Automated Test Suite for Order Processing & Inventory Workflow
 * Qasem E-Commerce Backend
 */

const dotenv = require('dotenv');

dotenv.config({ path: 'config.env' });
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;

async function runOrderWorkflowTests() {
  console.log('==================================================');
  console.log('STARTING ORDER PROCESSING & INVENTORY WORKFLOW TESTS');
  console.log('==================================================\n');

  let adminToken = '';
  let customerToken = '';
  let testCategoryId = '';
  let testProductId = '';
  let createdOrderId = '';
  let expectedEarnedPoints = 0;
  const uniqueId = Date.now();
  const customerEmail = `order_test_${uniqueId}@test.com`;

  try {
    // --------------------------------------------------
    // STEP 1: AUTHENTICATION
    // --------------------------------------------------
    console.log('Step 1: Authenticating Admin and Customer...');
    // Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'Admin@123' })
    });
    if (adminLoginRes.status !== 200) {
      throw new Error(`Admin login failed with status ${adminLoginRes.status}`);
    }
    adminToken = (await adminLoginRes.json()).token;

    // Customer Signup
    const customerSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Order Workflow Customer',
        email: customerEmail,
        password: 'User@123',
        passwordConfirm: 'User@123'
      })
    });
    if (customerSignupRes.status !== 201) {
      throw new Error(`Customer signup failed with status ${customerSignupRes.status}`);
    }
    customerToken = (await customerSignupRes.json()).token;
    console.log('✔ Admin and Customer authenticated successfully.');

    // --------------------------------------------------
    // STEP 2: SETUP CATEGORY & PRODUCT WITH STOCK
    // --------------------------------------------------
    console.log('\nStep 2: Creating test category and product (Stock = 10, Sold = 0)...');
    const catRes = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: `Stock Cat ${uniqueId}` })
    });
    testCategoryId = (await catRes.json()).data._id;

    const prodRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: `Inventory Melon ${uniqueId}`,
        name: `Inventory Melon ${uniqueId}`,
        quantity: 10,
        price: 20,
        originalPrice: 20,
        category: testCategoryId,
        image: 'melon.jpeg',
        imageCover: 'melon.jpeg'
      })
    });
    if (prodRes.status !== 201) {
      throw new Error(`Product creation failed: ${await prodRes.text()}`);
    }
    testProductId = (await prodRes.json()).data._id;
    console.log(`✔ Product created (ID: ${testProductId}, Initial Stock: 10).`);

    // --------------------------------------------------
    // STEP 3: ADD ITEM TO CART (QUANTITY = 2)
    // --------------------------------------------------
    console.log('\nStep 3: Customer adding 2 units of product to cart...');
    const cartAddRes = await fetch(`${BASE_URL}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ productId: testProductId })
    });
    if (cartAddRes.status !== 200) {
      throw new Error(`Add to cart failed: ${await cartAddRes.text()}`);
    }
    // Update quantity in cart to 2
    const cartData = (await cartAddRes.json()).data;
    const cartItemId = cartData.cartItems[0]._id;
    await fetch(`${BASE_URL}/cart/${cartItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ quantity: 2 })
    });
    console.log('✔ Product added to cart with quantity 2.');

    // --------------------------------------------------
    // STEP 4: ORDER CONFIRMATION & INITIAL STATE
    // --------------------------------------------------
    console.log('\nStep 4: Customer confirming order...');
    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        customerName: 'Order Workflow Customer',
        phone: '01116596635',
        address: '456 Green Field Avenue',
        taxPrice: 2,
        shippingPrice: 5
      })
    });

    if (orderRes.status !== 201) {
      throw new Error(`Order creation failed with status ${orderRes.status}: ${await orderRes.text()}`);
    }
    const orderData = (await orderRes.json()).data;
    createdOrderId = orderData._id;
    expectedEarnedPoints = orderData.earnedPoints;

    console.log(`✔ Order created successfully (ID: ${createdOrderId}).`);
    console.log(`  - Initial Order Status: '${orderData.orderStatus}' (Expected: 'pending')`);
    console.log(`  - Payment Status: ${orderData.isPaid ? 'Paid' : 'Unpaid'} (Method: '${orderData.paymentMethodType}')`);

    if (orderData.orderStatus !== 'pending') {
      throw new Error(`Initial order status mismatch. Expected 'pending', got: ${orderData.orderStatus}`);
    }

    // --------------------------------------------------
    // STEP 5: VERIFY DEFERRED LOYALTY POINTS ALLOCATION
    // --------------------------------------------------
    console.log('\nStep 5: Verifying loyalty points are NOT awarded on order creation...');
    const initialProfileRes = await fetch(`${BASE_URL}/users/getMe`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const initialProfile = (await initialProfileRes.json()).data;
    console.log(`  - Customer loyalty points balance: ${initialProfile.loyaltyPoints} (Expected: 0)`);
    if ((initialProfile.loyaltyPoints || 0) !== 0) {
      throw new Error('Loyalty points were prematurely awarded at order creation time!');
    }
    console.log('✔ Verified: Loyalty points deferred until delivery.');

    // --------------------------------------------------
    // STEP 6: VERIFY CART IS EMPTIED AFTER ORDER CREATION
    // --------------------------------------------------
    console.log('\nStep 6: Verifying customer cart was emptied after successful order creation...');
    const checkCartRes = await fetch(`${BASE_URL}/cart`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const checkCartData = await checkCartRes.json();
    const isCartEmpty = !checkCartData.data || checkCartData.data.cartItems.length === 0;
    if (!isCartEmpty) {
      throw new Error('Cart was not emptied after order creation!');
    }
    console.log('✔ Verified: Cart is completely empty.');

    // --------------------------------------------------
    // STEP 7: VERIFY INVENTORY DEDUCTION & SALES STATS
    // --------------------------------------------------
    console.log('\nStep 7: Verifying product stock decrease and sales stats increase...');
    const updatedProdRes = await fetch(`${BASE_URL}/products/${testProductId}`);
    const updatedProduct = (await updatedProdRes.json()).data;
    console.log(`  - Remaining Stock Quantity: ${updatedProduct.quantity} (Expected: 8, Initial: 10, Bought: 2)`);
    console.log(`  - Total Sold Quantity: ${updatedProduct.sold} (Expected: 2, Initial: 0)`);

    if (updatedProduct.quantity !== 8) {
      throw new Error(`Stock quantity calculation error. Expected 8, got: ${updatedProduct.quantity}`);
    }
    if (updatedProduct.sold !== 2) {
      throw new Error(`Sold quantity calculation error. Expected 2, got: ${updatedProduct.sold}`);
    }
    console.log('✔ Stock deducted and sales statistics incremented correctly.');

    // --------------------------------------------------
    // STEP 8: TEST INSUFFICIENT STOCK REJECTION
    // --------------------------------------------------
    console.log('\nStep 8: Testing order rejection when requested quantity exceeds available stock...');
    // Customer adds 1 unit to cart
    await fetch(`${BASE_URL}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ productId: testProductId })
    });

    // Admin reduces product stock to 0 (out of stock)
    await fetch(`${BASE_URL}/products/${testProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ quantity: 0 })
    });

    // Customer attempts to place order for out-of-stock product
    const excessOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        customerName: 'Order Workflow Customer',
        phone: '01116596635',
        address: '456 Green Field Avenue'
      })
    });

    if (excessOrderRes.status !== 400) {
      throw new Error(`Expected HTTP 400 rejection for excess stock request, but got status ${excessOrderRes.status}`);
    }
    console.log(`✔ Order correctly rejected due to insufficient stock (HTTP 400 returned).`);

    // Restore stock and clear cart
    await fetch(`${BASE_URL}/products/${testProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ quantity: 8 })
    });
    await fetch(`${BASE_URL}/cart`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    // --------------------------------------------------
    // STEP 9: ADMIN ORDER MANAGEMENT & WORKFLOW STATUSES
    // --------------------------------------------------
    console.log('\nStep 9: Testing Admin order management and status transitions...');
    // Admin list orders
    const adminOrdersRes = await fetch(`${BASE_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminOrders = (await adminOrdersRes.json()).data;
    const foundOrderInAdmin = adminOrders.some(o => o._id === createdOrderId);
    if (!foundOrderInAdmin) {
      throw new Error('Created order did not appear in Admin order list!');
    }
    console.log('✔ Order successfully listed in Admin Dashboard.');

    // Transition: pending -> preparing -> out_for_delivery
    const statusesToTest = ['preparing', 'out_for_delivery'];
    // These state transitions must execute in order and be verified one at a time.
    /* eslint-disable no-restricted-syntax, no-await-in-loop */
    for (const statusVal of statusesToTest) {
      console.log(`  - Admin updating status to '${statusVal}'...`);
      const updateRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: statusVal })
      });
      if (updateRes.status !== 200) {
        throw new Error(`Status update to '${statusVal}' failed with status ${updateRes.status}`);
      }
      const updatedStatus = (await updateRes.json()).data.orderStatus;
      if (updatedStatus !== statusVal) {
        throw new Error(`Status mismatch. Expected '${statusVal}', got: '${updatedStatus}'`);
      }

      // Assert points still not awarded
      const intermediateProfile = (await (await fetch(`${BASE_URL}/users/getMe`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      })).json()).data;
      if ((intermediateProfile.loyaltyPoints || 0) !== 0) {
        throw new Error(`Loyalty points prematurely awarded during status '${statusVal}'!`);
      }
    }
    /* eslint-enable no-restricted-syntax, no-await-in-loop */
    console.log('✔ Intermediate status updates executed cleanly without triggering premature loyalty rewards.');

    // --------------------------------------------------
    // STEP 10: COMPLETED STATUS & LOYALTY AWARD
    // --------------------------------------------------
    console.log('\nStep 10: Admin updating status to \'completed\' and verifying loyalty points award...');
    const completeRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'completed' })
    });
    if (completeRes.status !== 200) {
      throw new Error(`Status update to 'completed' failed: ${await completeRes.text()}`);
    }

    const completedProfile = (await (await fetch(`${BASE_URL}/users/getMe`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    })).json()).data;
    console.log(`  - Customer loyalty points balance after completion: ${completedProfile.loyaltyPoints} (Expected: ${expectedEarnedPoints})`);
    if (completedProfile.loyaltyPoints !== expectedEarnedPoints) {
      throw new Error(`Loyalty points balance mismatch after completion. Expected ${expectedEarnedPoints}, got: ${completedProfile.loyaltyPoints}`);
    }
    console.log('✔ Verified: Loyalty points awarded correctly upon status reaching \'completed\'.');

    // --------------------------------------------------
    // STEP 11: CANCELLATION & LOYALTY REVERSAL
    // --------------------------------------------------
    console.log('\nStep 11: Verifying loyalty points are reversed back to correct balance when order is cancelled...');
    const cancelRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'cancelled' })
    });
    if (cancelRes.status !== 200) {
      throw new Error(`Status update to 'cancelled' failed: ${await cancelRes.text()}`);
    }

    const finalProfile = (await (await fetch(`${BASE_URL}/users/getMe`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    })).json()).data;
    console.log(`  - Final customer loyalty points balance after cancellation: ${finalProfile.loyaltyPoints} (Expected: 0)`);
    if (finalProfile.loyaltyPoints !== 0) {
      throw new Error(`Duplicate loyalty points or reversal failure! Expected 0, got: ${finalProfile.loyaltyPoints}`);
    }
    console.log('✔ Verified: loyalty points correctly reversed on order cancellation.');

    // Cleanup test data
    await fetch(`${BASE_URL}/products/${testProductId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    await fetch(`${BASE_URL}/categories/${testCategoryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    console.log('\n==================================================');
    console.log('✔ ALL ORDER WORKFLOW & INVENTORY TESTS PASSED! ✔');
    console.log('==================================================');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ORDER WORKFLOW TEST FAILED:');
    console.error(error.message);
    console.log('==================================================');
    process.exit(1);
  }
}

runOrderWorkflowTests();
