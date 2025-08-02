// Import using ES modules syntax for Next.js project
import { sanitizeTextForLLM } from './src/utils/dataSanitization.js';

// Test with sample bank statement data that should trigger sanitization
const sampleBankStatementText = `
ICICI BANK LIMITED
Statement for Account: 123456789012345
Customer: MR. RAJESH KUMAR
Mobile: +91-9876543210
Email: rajesh@example.com
PAN: ABCDE1234F
Card: 4532 1234 5678 9012

Date        Description                     Debit    Credit   Balance
01-Jan-2025 Opening Balance                              -     81650
02-Jan-2025 UPI Payment to 9876543210       2500      -      79150
03-Jan-2025 NEFT from ABCD1234E             -         5000   84150
04-Jan-2025 ATM Withdrawal                  1500      -      82650
05-Jan-2025 Credit Card Payment             15000     -      67650

IFSC: ICIC0001234
Customer ID: CIF123456789
Branch: 123/A, Sector 45, Gurgaon, Haryana - 122001
`;

console.log('🧪 Testing Sanitization...');
console.log('Original text length:', sampleBankStatementText.length);

try {
  const result = sanitizeTextForLLM(sampleBankStatementText);
  
  console.log('\n📊 Sanitization Summary:');
  console.log(JSON.stringify(result.summary, null, 2));
  
  console.log('\n🔍 Detected Patterns:');
  result.detectedPatterns.forEach((pattern, index) => {
    console.log(`${index + 1}. ${pattern.type}: "${pattern.original}" → "${pattern.masked}"`);
  });
  
  console.log('\n📝 Sanitized Text Preview (first 500 chars):');
  console.log(result.sanitizedText.substring(0, 500));
  
} catch (error) {
  console.error('❌ Error testing sanitization:', error);
}
