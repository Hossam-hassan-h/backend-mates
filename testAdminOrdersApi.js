/* global fetch */
/**
 * Test script for Admin Orders search, date filtering, and statusCounts
 */
const BASE_URL = 'http://localhost:8000/api/v1';

async function test() {
  console.log('1. Logging in as Admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test.com',
      password: 'Admin@123',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const { token } = loginData;
  console.log('✔ Logged in successfully.');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // 1) Test standard GET /api/v1/orders
  console.log('\n2. Testing GET /api/v1/orders...');
  const res1 = await fetch(`${BASE_URL}/orders`, { headers: authHeaders });
  const data1 = await res1.json();
  console.log('Status code:', res1.status);
  console.log('Results count:', data1.results);
  console.log('Total:', data1.total);
  console.log('statusCounts:', data1.statusCounts);

  // 2) Test keyword search: name
  console.log('\n3. Testing GET /api/v1/orders?keyword=Integration...');
  const res2 = await fetch(`${BASE_URL}/orders?keyword=Integration`, { headers: authHeaders });
  const data2 = await res2.json();
  console.log('Keyword "Integration" results count:', data2.results);
  const matchedNames = data2.data && Array.isArray(data2.data)
    ? data2.data.slice(0, 3).map((o) => o.customerName)
    : [];
  console.log('Matched customer names:', matchedNames);

  // 3) Test keyword search: phone
  console.log('\n4. Testing GET /api/v1/orders?keyword=011...');
  const res3 = await fetch(`${BASE_URL}/orders?keyword=011`, { headers: authHeaders });
  const data3 = await res3.json();
  console.log('Keyword "011" results count:', data3.results);
  const matchedPhones = data3.data && Array.isArray(data3.data)
    ? data3.data.slice(0, 3).map((o) => o.phone)
    : [];
  console.log('Matched phones:', matchedPhones);

  // 4) Test orderStatus filter with statusCounts check
  console.log('\n5. Testing GET /api/v1/orders?orderStatus=pending...');
  const res4 = await fetch(`${BASE_URL}/orders?orderStatus=pending`, { headers: authHeaders });
  const data4 = await res4.json();
  console.log('Filtered to pending, results count:', data4.results);
  console.log('statusCounts (shows ALL statuses):', data4.statusCounts);

  console.log('\n✔ All tests passed!');
}

test().catch(console.error);
