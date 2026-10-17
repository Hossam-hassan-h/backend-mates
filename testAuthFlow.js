/**
 * Automated Authentication & Authorization Test Suite
 * Qasem E-Commerce Backend
 */

const BASE_URL = 'http://localhost:3000/api/v1';

async function runAuthTests() {
  console.log('==================================================');
  console.log('STARTING AUTOMATED AUTHENTICATION & AUTH TEST SUITE');
  console.log('==================================================\n');

  let customerToken = '';
  let adminToken = '';
  const testEmail = `cust_auth_${Date.now()}@test.com`;
  const testPassword = 'User@123';

  try {
    // --------------------------------------------------
    // TEST 1: REGISTRATION
    // --------------------------------------------------
    console.log('Test 1: Registering new customer without email verification requirement...');
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Auth Tester',
        email: testEmail,
        password: testPassword,
        passwordConfirm: testPassword
      })
    });

    if (signupRes.status !== 201) {
      throw new Error(`Registration failed with status ${signupRes.status}: ${await signupRes.text()}`);
    }
    const signupData = await signupRes.json();
    
    if (!signupData.token) {
      throw new Error('Registration failed to return a valid JWT token.');
    }
    if (signupData.data.password || (signupData.data._doc && signupData.data._doc.password)) {
      throw new Error('Security flaw: Password hash was leaked in registration response.');
    }

    console.log('✔ Registration successful! Returned HTTP 201, valid JWT, and sanitized user payload.');

    // --------------------------------------------------
    // TEST 2: LOGIN
    // --------------------------------------------------
    console.log('\nTest 2: Logging in immediately after registration...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
    }
    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error('Login failed to return a valid JWT token.');
    }
    customerToken = loginData.token;
    console.log('✔ Login successful! HTTP 200 returned with JWT token.');

    // --------------------------------------------------
    // TEST 3: PROTECTED CUSTOMER ROUTE
    // --------------------------------------------------
    console.log('\nTest 3: Accessing protected customer endpoint (/users/getMe)...');
    const meRes = await fetch(`${BASE_URL}/users/getMe`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    if (meRes.status !== 200) {
      throw new Error(`Protected route access failed with status ${meRes.status}`);
    }
    const meData = await meRes.json();
    if (meData.data.email !== testEmail) {
      throw new Error('Returned user profile does not match registered email.');
    }
    console.log('✔ Protected customer route access verified.');

    // --------------------------------------------------
    // TEST 4: ADMIN AUTHENTICATION
    // --------------------------------------------------
    console.log('\nTest 4: Logging in as Admin (admin@test.com / Admin@123)...');
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
    if (adminLoginData.data.role !== 'admin') {
      throw new Error(`Admin user role mismatch, expected 'admin', got: ${adminLoginData.data.role}`);
    }
    adminToken = adminLoginData.token;
    console.log('✔ Admin authentication verified.');

    // --------------------------------------------------
    // TEST 5: PROTECTED ADMIN ROUTE
    // --------------------------------------------------
    console.log('\nTest 5: Accessing protected admin endpoint (/users)...');
    const adminRouteRes = await fetch(`${BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (adminRouteRes.status !== 200) {
      throw new Error(`Admin route access failed with status ${adminRouteRes.status}`);
    }
    console.log('✔ Protected admin route access verified.');

    // --------------------------------------------------
    // TEST 6: AUTHORIZATION PERMISSION DENIED (RBAC 403)
    // --------------------------------------------------
    console.log('\nTest 6: Verifying RBAC authorization (customer trying to access /users)...');
    const rbacRes = await fetch(`${BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    if (rbacRes.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden for unauthorized access, but got status ${rbacRes.status}`);
    }
    console.log('✔ RBAC authorization protection verified (HTTP 403 returned).');

    console.log('\n==================================================');
    console.log('✔ ALL AUTHENTICATION & AUTHORIZATION TESTS PASSED! ✔');
    console.log('==================================================');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ AUTHENTICATION TEST FAILED:');
    console.error(error.message);
    console.log('==================================================');
    process.exit(1);
  }
}

runAuthTests();
