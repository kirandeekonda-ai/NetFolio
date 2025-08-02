/**
 * Debug Statement Processing - Check why balance extraction isn't working
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugStatementProcessing() {
  try {
    console.log('🔍 Debugging Statement Balance Extraction...\n');

    // Check for any statements (even without authentication, we can see the structure)
    const { data: statements, error: statementsError } = await supabase
      .from('bank_statements')
      .select('*')
      .order('id', { ascending: false })
      .limit(5);

    if (statementsError && statementsError.code !== 'PGRST301') {
      console.error('❌ Error fetching statements:', statementsError.message);
      return;
    }

    console.log(`📄 Found ${statements?.length || 0} recent statements`);
    
    if (statements && statements.length > 0) {
      console.log('\n📊 Statement Analysis:');
      statements.forEach((stmt, index) => {
        console.log(`\n${index + 1}. Statement ID: ${stmt.id}`);
        console.log(`   Period: ${stmt.statement_year}-${stmt.statement_month}`);
        console.log(`   Status: ${stmt.processing_status}`);
        console.log(`   Closing Balance: ${stmt.closing_balance ? '₹' + stmt.closing_balance : 'NULL ❌'}`);
        console.log(`   Pages: ${stmt.page_count || 'Unknown'}`);
        console.log(`   Created: ${stmt.uploaded_at || stmt.updated_at || 'Unknown'}`);
      });

      // Check for balance extractions for these statements
      console.log('\n🔍 Checking balance extractions...');
      
      const statementIds = statements.map(s => s.id);
      const { data: extractions, error: extractionsError } = await supabase
        .from('balance_extractions')
        .select('*')
        .in('bank_statement_id', statementIds)
        .order('updated_at', { ascending: false });

      if (extractionsError && extractionsError.code !== 'PGRST301') {
        console.error('❌ Error fetching balance extractions:', extractionsError.message);
      } else {
        console.log(`📈 Found ${extractions?.length || 0} balance extractions`);
        
        if (extractions && extractions.length > 0) {
          extractions.forEach((ext, index) => {
            console.log(`\n${index + 1}. Extraction for Statement: ${ext.bank_statement_id}`);
            console.log(`   Page: ${ext.page_number}`);
            console.log(`   Opening Balance: ${ext.opening_balance ? '₹' + ext.opening_balance : 'null'}`);
            console.log(`   Closing Balance: ${ext.closing_balance ? '₹' + ext.closing_balance : 'null'}`);
            console.log(`   Confidence: ${ext.balance_confidence}%`);
            console.log(`   Notes: ${ext.balance_extraction_notes}`);
          });
        } else {
          console.log('❌ No balance extractions found!');
          console.log('\n🚨 This indicates one of these issues:');
          console.log('   1. AI balance extraction is not detecting balances');
          console.log('   2. The finalize-balance API is not being called');
          console.log('   3. The process-page API is not collecting balance data');
        }
      }
    } else {
      console.log('❌ No statements found (possibly due to RLS/authentication)');
      console.log('\n💡 To debug properly, we need to:');
      console.log('   1. Check the browser console during statement upload');
      console.log('   2. Look at the server logs for AI processing');
      console.log('   3. Verify the finalize-balance API is being called');
    }

    console.log('\n🔧 Next debugging steps:');
    console.log('   1. Open browser dev tools during statement upload');
    console.log('   2. Look for API calls to /api/ai/process-page');
    console.log('   3. Check if balance_data is present in API responses');
    console.log('   4. Verify /api/statements/finalize-balance is called');
    console.log('   5. Check server logs for any AI processing errors');

  } catch (error) {
    console.error('❌ Error debugging statement processing:', error);
  }
}

debugStatementProcessing();
