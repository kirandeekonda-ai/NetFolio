/**
 * Migrate Balance Data - Move closing balances from balance_extractions to bank_statements
 * This creates a single source of truth by consolidating balance data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrateBalanceData() {
  console.log('🔄 Migrating Balance Data to Single Source of Truth\n');
  
  try {
    // Get all balance extractions with closing balance
    console.log('1️⃣ Fetching balance extractions...');
    const { data: extractions, error: extractionsError } = await supabase
      .from('balance_extractions')
      .select('*')
      .not('closing_balance', 'is', null)
      .order('created_at', { ascending: false });
    
    if (extractionsError) {
      console.error('❌ Error fetching extractions:', extractionsError.message);
      return;
    }
    
    console.log(`✅ Found ${extractions?.length || 0} balance extractions`);
    
    if (!extractions || extractions.length === 0) {
      console.log('ℹ️ No balance data to migrate');
      return;
    }
    
    // Group by bank_statement_id and get the highest confidence closing balance
    const statementBalances = new Map();
    
    for (const extraction of extractions) {
      const statementId = extraction.bank_statement_id;
      const closingBalance = extraction.closing_balance;
      const confidence = extraction.balance_confidence || 0;
      
      if (!statementBalances.has(statementId) || 
          confidence > statementBalances.get(statementId).confidence) {
        statementBalances.set(statementId, {
          statementId,
          closingBalance,
          confidence,
          pageNumber: extraction.page_number
        });
      }
    }
    
    console.log(`\n2️⃣ Processing ${statementBalances.size} unique statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Update each bank statement with its closing balance
    for (const [statementId, balanceData] of statementBalances) {
      try {
        console.log(`💰 Updating statement ${statementId}: ₹${balanceData.closingBalance} (${balanceData.confidence}% confidence)`);
        
        const { error: updateError } = await supabase
          .from('bank_statements')
          .update({ closing_balance: balanceData.closingBalance })
          .eq('id', statementId);
        
        if (updateError) {
          console.error(`❌ Error updating statement ${statementId}:`, updateError.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`💥 Unexpected error for statement ${statementId}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n🎯 Migration Complete!`);
    console.log(`✅ Successfully updated: ${successCount} statements`);
    console.log(`❌ Errors: ${errorCount} statements`);
    
    if (successCount > 0) {
      console.log('\n📋 Next Steps:');
      console.log('1. Refresh your dashboard - it should now show statement-based balances');
      console.log('2. Check that statement month indicators appear correctly');
      console.log('3. Verify balance amounts match your statements');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

// Run the migration
if (require.main === module) {
  migrateBalanceData();
}

module.exports = { migrateBalanceData };
