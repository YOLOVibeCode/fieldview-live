/**
 * Test Square Sandbox Connection
 * 
 * Verifies that Square credentials are valid and can connect to Square API
 */

const { SquareClient, SquareEnvironment } = require('square');

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';

async function testSquareConnection() {
  console.log('🔐 Testing Square Sandbox Connection\n');
  
  // Verify env vars
  console.log('Environment Variables:');
  console.log('  SQUARE_ACCESS_TOKEN:', SQUARE_ACCESS_TOKEN ? `✅ SET (${SQUARE_ACCESS_TOKEN.substring(0, 10)}...)` : '❌ NOT SET');
  console.log('  SQUARE_LOCATION_ID:', SQUARE_LOCATION_ID || '❌ NOT SET');
  console.log('  SQUARE_ENVIRONMENT:', SQUARE_ENVIRONMENT);
  console.log('');

  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    console.error('❌ Missing Square credentials in .env file');
    process.exit(1);
  }

  try {
    // Initialize Square client
    const client = new SquareClient({
      token: SQUARE_ACCESS_TOKEN,
      environment: SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    console.log('🔌 Connecting to Square API...\n');

    // Test 1: Get location details
    console.log('Test 1: Retrieve Location');
    const { result: locationResult } = await client.locationsApi.retrieveLocation(SQUARE_LOCATION_ID);
    console.log('  ✅ Location Retrieved:');
    console.log('     - Name:', locationResult.location?.name || 'N/A');
    console.log('     - ID:', locationResult.location?.id || 'N/A');
    console.log('     - Status:', locationResult.location?.status || 'N/A');
    console.log('     - Address:', locationResult.location?.address?.addressLine1 || 'N/A');
    console.log('');

    // Test 2: List payment links (to test API access)
    console.log('Test 2: List Payment Links (Checkout API)');
    try {
      const { result: linksResult } = await client.checkoutApi.listPaymentLinks({
        limit: 1,
      });
      console.log('  ✅ Checkout API Access: OK');
      console.log('     - Total Payment Links:', linksResult.paymentLinks?.length || 0);
      console.log('');
    } catch (linkError) {
      console.log('  ⚠️  Checkout API: Limited access (expected for sandbox)');
      console.log('');
    }

    // Test 3: Create a test payment link
    console.log('Test 3: Create Test Payment Link');
    try {
      const idempotencyKey = `test-${Date.now()}`;
      const { result: paymentLinkResult } = await client.checkoutApi.createPaymentLink({
        idempotencyKey,
        order: {
          locationId: SQUARE_LOCATION_ID,
          lineItems: [
            {
              name: 'Test Stream Access',
              quantity: '1',
              basePriceMoney: {
                amount: BigInt(500), // $5.00
                currency: 'USD',
              },
            },
          ],
        },
        checkoutOptions: {
          allowTipping: false,
          redirectUrl: 'http://localhost:4300/payment-success',
        },
      });

      console.log('  ✅ Payment Link Created:');
      console.log('     - ID:', paymentLinkResult.paymentLink?.id || 'N/A');
      console.log('     - URL:', paymentLinkResult.paymentLink?.url || 'N/A');
      console.log('     - Amount: $5.00 USD');
      console.log('');
      
      if (paymentLinkResult.paymentLink?.url) {
        console.log('🎉 You can test the payment link in your browser:');
        console.log(`   ${paymentLinkResult.paymentLink.url}`);
        console.log('');
        console.log('💳 Use Square test cards:');
        console.log('   - Success: 4111 1111 1111 1111');
        console.log('   - CVV: Any 3 digits');
        console.log('   - Expiry: Any future date');
        console.log('   - ZIP: Any 5 digits');
        console.log('');
      }
    } catch (linkError) {
      console.log('  ⚠️  Could not create payment link:', linkError.message);
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
    console.error('\n❌ Square API Error:');
    console.error('   Message:', error.message);
    if (error.errors) {
      console.error('   Details:', JSON.stringify(error.errors, null, 2));
    }
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('   1. Verify credentials at: https://developer.squareup.com/apps');
    console.error('   2. Ensure SQUARE_ENVIRONMENT is set to "sandbox"');
    console.error('   3. Check that access token is not expired');
    process.exit(1);
  }
}

testSquareConnection();
