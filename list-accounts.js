/**
 * List all bank accounts to understand the current state
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listAccounts() {
  console.log('🏦 Listing all bank accounts...\n');
  
  try {
    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!accounts || accounts.length === 0) {
      console.log('❌ No accounts found');
      return;
    }
    
    console.log(`✅ Found ${accounts.length} accounts:\n`);
    
    accounts.forEach((acc, index) => {
      console.log(`${index + 1}. ID: ${acc.id}`);
      console.log(`   Bank: ${acc.bank_name} (${acc.account_type})`);
      console.log(`   Nickname: ${acc.account_nickname || 'None'}`);
      console.log(`   Starting Balance: ₹${acc.starting_balance}`);
      console.log(`   Current Balance: ${acc.current_balance ? '₹' + acc.current_balance : 'NULL (after trigger removal)'}`);
      console.log(`   Active: ${acc.is_active}`);
      console.log('');
    });
    
    // Also check for any balance extractions
    console.log('🔍 Checking for balance extractions...\n');
    const { data: extractions, error: extractError } = await supabase
      .from('balance_extractions')
      .select('*')
      .limit(5);
      
    if (extractError) {
      console.log('❌ Error checking extractions:', extractError.message);
    } else {
      console.log(`Found ${extractions?.length || 0} balance extractions`);
      if (extractions && extractions.length > 0) {
        extractions.forEach((ext, index) => {
          console.log(`${index + 1}. Statement ID: ${ext.bank_statement_id}`);
          console.log(`   Closing Balance: ₹${ext.closing_balance}`);
          console.log(`   Confidence: ${ext.balance_confidence}%`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

listAccounts();
