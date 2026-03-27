async function test() {
  const base = 'http://localhost:3000';
  console.log('--- Testing Backend API ---');

  // 1. Register test customer user
  let email = `test-cust-${Date.now()}@example.com`;
  console.log('Registering Customer:', email);
  let res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password: 'password', role: 'customer', name: 'Cust Test' })
  });
  let custData = await res.json();
  console.log('Customer Registration Status:', res.status, res.status === 201 ? 'Success' : custData);

  // 2. Login Customer
  console.log('Logging in Customer');
  res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password: 'password', role: 'customer' })
  });
  let loginData = await res.json();
  console.log('Customer Login Status:', res.status, loginData.token ? 'Success (Token received)' : 'Failed');
  
  if (loginData.token) {
    // 3. Check Sessions
    console.log('Fetching Sessions');
    let sessionsRes = await fetch(`${base}/api/sessions/customer/${loginData.user.id}`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    console.log('Customer Sessions Status:', sessionsRes.status, await sessionsRes.json());
  }

  // 4. Register Trainer
  let trainerEmail = `test-trainer-${Date.now()}@example.com`;
  console.log('Registering Trainer:', trainerEmail);
  res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email: trainerEmail, password: 'password', role: 'trainer', name: 'Trainer Test', specialization: 'Yoga' })
  });
  let trainerRegData = await res.json();
  console.log('Trainer Registration Status:', res.status, res.status === 201 ? 'Success' : trainerRegData);
}

test().catch(console.error);
