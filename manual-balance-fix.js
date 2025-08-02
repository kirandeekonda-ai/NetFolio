/**
 * Manual Balance Fix - Set closing balance for a specific statement
 * Use this to test if the balance display works once we have balance data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function manualBalanceFix() {
  console.log('🔧 Manual Balance Fix Tool\n');
  console.log('This will help test if balance display works once we have balance data.\n');
  
  console.log('📝 Instructions:');
  console.log('1. Go to your NetFolio dashboard');
  console.log('2. Open browser Dev Tools (F12)');
  console.log('3. Go to Application > Storage > Supabase');
  console.log('4. Find your statement ID from the bank_statements table');
  console.log('5. Come back and run: node manual-balance-fix.js <statement-id> <balance-amount>');
  console.log('\nExample: node manual-balance-fix.js abc123-def456 25000.50');
  
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('\n❌ Missing arguments');
    console.log('Usage: node manual-balance-fix.js <statement-id> <balance-amount>');
    return;
  }
  
  const [statementId, balanceAmount] = args;
  const balance = parseFloat(balanceAmount);
  
  if (isNaN(balance)) {
    console.log('❌ Invalid balance amount');
    return;
  }
  
  try {
    console.log(`\n🎯 Attempting to set balance for statement ${statementId}`);
    console.log(`💰 Balance: ₹${balance}`);
    
    // Note: This might fail due to RLS, but will show what needs to be done
    const { data, error } = await supabase
      .from('bank_statements')
      .update({ closing_balance: balance })
      .eq('id', statementId)
      .select();
    
    if (error) {
      console.log('❌ Unable to update directly due to authentication');
      console.log('💡 You need to run this from the authenticated app context');
      console.log('\n🔧 Alternative approach:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to Table Editor > bank_statements');
      console.log('3. Find your statement row');
      console.log(`4. Set closing_balance = ${balance}`);
      console.log('5. Save and refresh your NetFolio dashboard');
    } else {
      console.log('✅ Balance updated successfully!');
      console.log('🎉 Now check your NetFolio dashboard - the balance should appear');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

manualBalanceFix();
