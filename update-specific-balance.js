/**
 * Manual Balance Update - Set the closing balance for the specific statement
 * Based on the balance extraction data you provided earlier
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateSpecificBalance() {
  console.log('🔧 Updating Specific Statement Balance\n');
  
  // Based on your earlier data
  const statementId = 'd549a737-2983-4346-b08f-3832a554c581';
  const closingBalance = 55531.02;
  
  try {
    console.log(`📋 Statement ID: ${statementId}`);
    console.log(`💰 Closing Balance: ₹${closingBalance}`);
    
    // Update the statement directly
    console.log('\n⚡ Updating bank_statements table...');
    
    const { data, error } = await supabase
      .from('bank_statements')
      .update({ closing_balance: closingBalance })
      .eq('id', statementId)
      .select('id, statement_month, statement_year, closing_balance');
    
    if (error) {
      console.error('❌ Error updating statement:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ No statement found with that ID');
      return;
    }
    
    const statement = data[0];
    console.log('✅ Successfully updated statement!');
    console.log(`   Statement: ${statement.statement_year}-${String(statement.statement_month).padStart(2, '0')}`);
    console.log(`   New closing_balance: ₹${statement.closing_balance}`);
    
    console.log('\n🎯 Balance Update Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to http://localhost:3001/dashboard');
    console.log('2. The balance should now show ₹55,531.02');
    console.log('3. You should see "Latest Statement: 2025-05" indicator');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

updateSpecificBalance();
