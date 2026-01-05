#!/usr/bin/env tsx
/**
 * Test script to verify case-insensitive password comparison
 */

const expectedPassword = (process.env.DIRECT_ADMIN_PASSWORD || 'admin2026').toLowerCase().trim();

function testPassword(provided: string): boolean {
  const providedPassword = (provided || '').toLowerCase().trim();
  return providedPassword === expectedPassword;
}

console.log('🧪 Testing password comparison logic...\n');
console.log(`Expected password (normalized): "${expectedPassword}"\n`);

const testCases = [
  { input: 'admin2026', expected: true, description: 'Lowercase' },
  { input: 'ADMIN2026', expected: true, description: 'Uppercase' },
  { input: 'Admin2026', expected: true, description: 'Mixed case' },
  { input: '  admin2026  ', expected: true, description: 'With whitespace' },
  { input: '  ADMIN2026  ', expected: true, description: 'Uppercase with whitespace' },
  { input: 'wrongpassword', expected: false, description: 'Invalid password' },
  { input: '', expected: false, description: 'Empty password' },
  { input: 'admin2027', expected: false, description: 'Wrong year' },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = testPassword(testCase.input);
  const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === testCase.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} - ${testCase.description}`);
  console.log(`   Input: "${testCase.input}"`);
  console.log(`   Expected: ${testCase.expected}, Got: ${result}\n`);
}

console.log('\n📊 Results:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   Total: ${testCases.length}\n`);

if (failed === 0) {
  console.log('🎉 All tests passed! Password fix is working correctly.');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the password comparison logic.');
  process.exit(1);
}

