/**
 * Test suite for data sanitization utility
 * Run this to test the sanitization patterns
 */

import { sanitizeText, sanitizeTextForLLM } from './dataSanitization';

// Sample bank statement text with sensitive information
const sampleBankStatementText = `
BANK STATEMENT
ICICI BANK LIMITED
Customer Name: MR. RAJESH KUMAR
Account Number: 123456789012345
Customer ID: CIF123456789
Mobile: +91-9876543210
Email: rajesh.kumar@example.com
PAN: ABCDE1234F
IFSC Code: ICIC0001234

TRANSACTION DETAILS
Date        Description                    Amount    Balance
01-Jan-2025 ATM WITHDRAWAL                 -5000     45000
02-Jan-2025 NEFT FROM AMAZON PAY          +2500     47500
03-Jan-2025 UPI PAYMENT TO 9988776655      -850      46650
04-Jan-2025 SALARY CREDIT                 +50000    96650
05-Jan-2025 Credit Card Payment           -15000    81650

Address: 123/A, Sector 45, Gurgaon, Haryana - 122001
Alternative Contact: 8765432109

Customer Support: support@icicibank.com
Branch IFSC: ICIC0001234
Card Number: 4532 1234 5678 9012
`;

function testSanitization() {
  console.log('🧪 Testing Data Sanitization Utility\n');
  
  console.log('📄 Original text (first 200 chars):');
  console.log(sampleBankStatementText.substring(0, 200) + '...\n');
  
  const result = sanitizeText(sampleBankStatementText, {
    enableLogging: true
  });
  
  console.log('🔐 Sanitized text (first 200 chars):');
  console.log(result.sanitizedText.substring(0, 200) + '...\n');
  
  console.log('📊 Detection Summary:');
  console.log(result.summary);
  
  console.log('\n🔍 Detected Patterns (first 5):');
  result.detectedPatterns.slice(0, 5).forEach((pattern, index) => {
    console.log(`${index + 1}. ${pattern.type}: "${pattern.original}" → "${pattern.masked}"`);
  });
  
  console.log('\n✅ Sanitization Test Complete');
}

// Test with different configurations
function testSanitizationConfigs() {
  console.log('\n🧪 Testing Different Sanitization Configurations\n');
  
  // Test with minimal sanitization
  const minimal = sanitizeText(sampleBankStatementText, {
    enableAccountNumberSanitization: true,
    enableMobileNumberSanitization: true,
    enableEmailSanitization: false,
    enablePanIdSanitization: true,
    enableCustomerIdSanitization: false,
    enableIFSCCodeSanitization: false,
    enableCardNumberSanitization: true,
    enableAddressSanitization: false,
    enableNameSanitization: false,
    enableLogging: false,
  });
  
  console.log('📊 Minimal Sanitization Summary:');
  console.log(minimal.summary);
  
  // Test with aggressive sanitization
  const aggressive = sanitizeText(sampleBankStatementText, {
    enableAccountNumberSanitization: true,
    enableMobileNumberSanitization: true,
    enableEmailSanitization: true,
    enablePanIdSanitization: true,
    enableCustomerIdSanitization: true,
    enableIFSCCodeSanitization: true,
    enableCardNumberSanitization: true,
    enableAddressSanitization: true,
    enableNameSanitization: true,
    enableLogging: false,
  });
  
  console.log('\n📊 Aggressive Sanitization Summary:');
  console.log(aggressive.summary);
  
  console.log('\n✅ Configuration Tests Complete');
}

// Test the convenience function
function testConvenienceFunction() {
  console.log('\n🧪 Testing Convenience Function (Environment-based)\n');
  
  const result = sanitizeTextForLLM(sampleBankStatementText);
  
  console.log('📊 Environment-based Sanitization Summary:');
  console.log(result.summary);
  
  console.log('\n✅ Convenience Function Test Complete');
}

// Run all tests
if (require.main === module) {
  testSanitization();
  testSanitizationConfigs();
  testConvenienceFunction();
}
