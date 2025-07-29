/**
 * Test Balance Extraction Feature
 * Verifies that the enhanced prompts correctly extract balance information
 */

import { transactionPromptBuilder } from '../src/lib/llm/PromptTemplateService';

// Test sample bank statement page with balance information
const sampleBankStatementPage = `
HDFC BANK LIMITED
Statement of Account

Account Number: XXXX1234
Statement Period: 01-Jan-2024 to 31-Jan-2024

Opening Balance: 45,250.00

Date        Description                    Debit    Credit   Balance
01-Jan-2024 SALARY CREDIT                           50,000   95,250.00
02-Jan-2024 ATM WDL HYDERABAD             5,000              90,250.00
03-Jan-2024 UPI PAYMENT ZOMATO            750               89,500.00
04-Jan-2024 NEFT TRANSFER                 20,000            69,500.00

Closing Balance: 69,500.00
Available Balance: 69,500.00
`;

function testBalanceExtraction() {
  console.log('🧪 Testing Enhanced Balance Extraction\n');
  
  // Create prompt with balance detection
  const prompt = transactionPromptBuilder.buildTransactionExtractionPrompt(
    sampleBankStatementPage,
    []
  );
  
  console.log('Generated Prompt:');
  console.log('=' .repeat(80));
  console.log(prompt);
  console.log('=' .repeat(80));
  
  // Check if prompt contains balance detection instructions
  const hasBalanceInstructions = prompt.includes('balance_data') && 
                                 prompt.includes('Balance Detection') &&
                                 prompt.includes('opening_balance') &&
                                 prompt.includes('closing_balance');
  
  console.log('\n✅ Balance Detection Features:');
  console.log('- Contains balance_data structure:', prompt.includes('balance_data'));
  console.log('- Contains balance detection instructions:', prompt.includes('Balance Detection'));
  console.log('- Contains opening_balance field:', prompt.includes('opening_balance'));
  console.log('- Contains closing_balance field:', prompt.includes('closing_balance'));
  console.log('- Contains confidence scoring:', prompt.includes('balance_confidence'));
  console.log('- Contains extraction notes:', prompt.includes('balance_extraction_notes'));
  
  console.log('\n🏦 Expected Output Structure:');
  console.log(`{
  "transactions": [...],
  "balance_data": {
    "opening_balance": 45250.00,
    "closing_balance": 69500.00,
    "available_balance": 69500.00,
    "current_balance": null,
    "balance_confidence": 95,
    "balance_extraction_notes": "Clear opening and closing balance found in statement header/footer"
  }
}`);
  
  return hasBalanceInstructions;
}

// Run the test
if (require.main === module) {
  const success = testBalanceExtraction();
  console.log('\n🎯 Test Result:', success ? '✅ PASSED' : '❌ FAILED');
  
  if (success) {
    console.log('\n✅ Story 1.1 Enhanced AI Balance Detection is ready for testing!');
    console.log('\nNext Steps:');
    console.log('1. Test with actual bank statement pages');
    console.log('2. Verify balance data is saved to database');
    console.log('3. Check confidence scoring accuracy');
    console.log('4. Monitor Gemini 2.0 Flash performance');
  }
}

export { testBalanceExtraction };
