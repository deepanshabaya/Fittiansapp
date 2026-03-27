const API_URL = 'http://127.0.0.1:3000/api';

async function testPhase1() {
  console.log('--- Starting Phase 1 Tests ---');
  try {
    // 0. Verify Health
    const health = await fetch(`${API_URL}/health`);
    if (!health.ok) throw new Error('Server not running');
    console.log('Server is healthy.');

    // 1. Register Trainer
    const trainerEmail = `trainer_${Date.now()}@example.com`;
    console.log(`\nRegistering Trainer: ${trainerEmail}`);
    
    const regTrainerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Super Trainer',
        email: trainerEmail,
        password: 'password123',
        role: 'trainer',
        experienceYears: 5,
        specialization: 'Weightlifting',
        certifications: ['ACE', 'NASM'],
        certificationAcademy: 'Global Fitness Institute',
        introductionVideoUrl: 'https://www.youtube.com/@Fittians',
      })
    });
    const trainerData = await regTrainerRes.json();
    console.log('Trainer Registered:', trainerData.user?.email);

    // 2. Fetch Trainer Profile (should not be approved by default)
    console.log('\nChecking Trainer Approval Status...');
    const tToken = trainerData.token;
    const profileRes = await fetch(`${API_URL}/trainers/me`, {
      headers: { Authorization: `Bearer ${tToken}` },
    });
    const profileData = await profileRes.json();
    console.log('Trainer is_approved:', profileData.trainer.is_approved);
    console.log('Trainer Certs:', profileData.trainer.certifications);

    // 3. Register Customer
    const customerEmail = `customer_${Date.now()}@example.com`;
    console.log(`\nRegistering Customer: ${customerEmail}`);
    const regCustRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Happy Customer',
        email: customerEmail,
        password: 'password123',
        role: 'customer',
      })
    });
    const custData = await regCustRes.json();
    console.log('Customer Registered:', custData.user?.email);

    console.log('\n--- Phase 1 Test Completed successfully! ---');

  } catch (error) {
    console.error('Test failed with Error:', error.message || error);
  }
}

testPhase1();
