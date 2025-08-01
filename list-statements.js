/**
 * List all statements to find the correct ID
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listStatements() {
  console.log('📋 Listing all bank statements...\n');
  
  try {
    const { data: statements, error } = await supabase
      .from('bank_statements')
      .select(`
        id,
        statement_month,
        statement_year,
        closing_balance,
        bank_account_id,
        bank_accounts!inner(bank_name, account_type)
      `)
      .order('statement_year', { ascending: false })
      .order('statement_month', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!statements || statements.length === 0) {
      console.log('❌ No statements found');
      return;
    }
    
    console.log(`✅ Found ${statements.length} statements:\n`);
    
    statements.forEach((stmt, index) => {
      console.log(`${index + 1}. ID: ${stmt.id}`);
      console.log(`   Bank: ${stmt.bank_accounts.bank_name} (${stmt.bank_accounts.account_type})`);
      console.log(`   Period: ${stmt.statement_year}-${String(stmt.statement_month).padStart(2, '0')}`);
      console.log(`   Closing Balance: ${stmt.closing_balance ? '₹' + stmt.closing_balance : 'NULL'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

listStatements();
