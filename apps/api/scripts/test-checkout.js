/**
 * Test Square Checkout API
 * Direct test to diagnose any issues
 */

const API_URL = 'http://localhost:4301';

async function testCheckout() {
  console.log('🧪 Testing Square Checkout API\n');

  try {
    const response = await fetch(`${API_URL}/api/direct/tchs/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-checkout@example.com',
        firstName: 'Test',
        lastName: 'Checkout',
      }),
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Checkout API working!');
      console.log('Purchase ID:', data.purchaseId);
      console.log('Checkout URL:', data.checkoutUrl);
    } else {
      console.log('\n❌ Checkout API failed');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

testCheckout();
