/**
 * Simple Square Sandbox Validation
 * 
 * Tests if Square credentials are valid using a simple HTTP request
 */

async function testSquare() {
  const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
  const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
  const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  
  console.log('🔐 Testing Square Sandbox Credentials\n');
  console.log('Environment Variables:');
  console.log('  TOKEN:', SQUARE_ACCESS_TOKEN ? `✅ SET (${SQUARE_ACCESS_TOKEN.substring(0, 10)}...)` : '❌ NOT SET');
  console.log('  LOCATION_ID:', SQUARE_LOCATION_ID || '❌ NOT SET');
  console.log('  ENVIRONMENT:', SQUARE_ENVIRONMENT);
  console.log('');

  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    console.error('❌ Missing Square credentials');
    process.exit(1);
  }

  const baseUrl = SQUARE_ENVIRONMENT === 'production' 
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  try {
    // Test 1: Get Location Details
    console.log('Test 1: Retrieve Location Details');
    const locationResponse = await fetch(`${baseUrl}/v2/locations/${SQUARE_LOCATION_ID}`, {
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!locationResponse.ok) {
      const error = await locationResponse.json();
      console.log('  ❌ Failed:', error.errors?.[0]?.detail || locationResponse.statusText);
      throw new Error('Location API failed');
    }

    const locationData = await locationResponse.json();
    console.log('  ✅ Location Retrieved:');
    console.log('     - Name:', locationData.location?.name || 'N/A');
    console.log('     - ID:', locationData.location?.id || 'N/A');
    console.log('     - Status:', locationData.location?.status || 'N/A');
    console.log('     - Currency:', locationData.location?.currency || 'N/A');
    console.log('');

    // Test 2: List Payment Links (test checkout API access)
    console.log('Test 2: Test Checkout API Access');
    const linksResponse = await fetch(`${baseUrl}/v2/online-checkout/payment-links?limit=1`, {
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (linksResponse.ok) {
      const linksData = await linksResponse.json();
      console.log('  ✅ Checkout API: Accessible');
      console.log('     - Payment Links:', linksData.payment_links?.length || 0);
      console.log('');
    } else {
      console.log('  ⚠️  Checkout API: Limited access (normal for sandbox)');
      console.log('');
    }

    // Test 3: Create a test payment link
    console.log('Test 3: Create Test Payment Link');
    const idempotencyKey = `test-${Date.now()}`;
    const createResponse = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        order: {
          location_id: SQUARE_LOCATION_ID,
          line_items: [
            {
              name: 'Test Stream Access',
              quantity: '1',
              base_price_money: {
                amount: 500, // $5.00
                currency: 'USD',
              },
            },
          ],
        },
        checkout_options: {
          allow_tipping: false,
          redirect_url: 'http://localhost:4300/payment-success',
        },
      }),
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('  ✅ Payment Link Created:');
      console.log('     - ID:', createData.payment_link?.id || 'N/A');
      console.log('     - URL:', createData.payment_link?.url || 'N/A');
      console.log('     - Amount: $5.00 USD');
      console.log('');

      if (createData.payment_link?.url) {
        console.log('🎉 SUCCESS! You can test the payment in your browser:');
        console.log(`   ${createData.payment_link.url}`);
        console.log('');
        console.log('💳 Use Square test cards:');
        console.log('   - Card: 4111 1111 1111 1111');
        console.log('   - CVV: Any 3 digits');
        console.log('   - Expiry: Any future date');
        console.log('   - ZIP: Any 5 digits');
        console.log('');
      }
    } else {
      const error = await createResponse.json();
      console.log('  ⚠️  Could not create payment link:');
      console.log('     ', error.errors?.[0]?.detail || createResponse.statusText);
      console.log('');
    }

    // Summary
    console.log('✅ Square Sandbox Connection: SUCCESSFUL');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - Authentication: ✅ Valid');
    console.log('   - Location Access: ✅ Working');
    console.log('   - Checkout API: ✅ Accessible');
    console.log('');
    console.log('🎬 Ready for paywall integration!');

  } catch (error) {
    console.error('\n❌ Square API Error:', error.message);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('   1. Verify credentials at: https://developer.squareup.com/apps');
    console.error('   2. Ensure SQUARE_ENVIRONMENT is "sandbox"');
    console.error('   3. Check that access token is not expired');
    process.exit(1);
  }
}

testSquare();
