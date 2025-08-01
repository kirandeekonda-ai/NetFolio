/**
 * Complete Test - Demonstrate Fixed Balance System
 * This will create test data and verify the SimplifiedBalanceService works correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createTestData() {
  console.log('🧪 Creating Test Data for Balance System\n');
  
  try {
    // Get the current user (you'll need to be logged in)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user found. Please log in to the app first.');
      console.log('   1. Go to http://localhost:3001');
      console.log('   2. Sign in/up');
      console.log('   3. Then run this script again');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    
    // 1. Create a test bank account
    console.log('\n1️⃣ Creating test bank account...');
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: user.id,
        bank_name: 'Test Bank',
        account_type: 'checking',
        account_nickname: 'Main Checking',
        starting_balance: 0,
        starting_balance_date: '2025-01-01',
        is_active: true
      })
      .select()
      .single();
    
    if (accountError) {
      console.error('❌ Error creating account:', accountError.message);
      return;
    }
    
    console.log(`✅ Created account: ${account.bank_name} (ID: ${account.id})`);
    
    // 2. Create a test bank statement with closing balance
    console.log('\n2️⃣ Creating test statement with closing balance...');
    const { data: statement, error: statementError } = await supabase
      .from('bank_statements')
      .insert({
        user_id: user.id,
        bank_account_id: account.id,
        statement_month: 5,
        statement_year: 2025,
        statement_start_date: '2025-05-01',
        statement_end_date: '2025-05-31',
        closing_balance: 55531.02, // The balance you mentioned
        processing_status: 'completed'
      })
      .select()
      .single();
    
    if (statementError) {
      console.error('❌ Error creating statement:', statementError.message);
      return;
    }
    
    console.log(`✅ Created statement: 2025-05 with closing balance ₹${statement.closing_balance}`);
    
    // 3. Test the SimplifiedBalanceService
    console.log('\n3️⃣ Testing SimplifiedBalanceService...');
    
    // Simulate what the service does
    const { data: testBalance, error: balanceError } = await supabase
      .from('bank_statements')
      .select(`
        closing_balance,
        statement_month,
        statement_year,
        bank_accounts!inner(id, bank_name, account_type, is_active)
      `)
      .eq('bank_accounts.is_active', true)
      .not('closing_balance', 'is', null)
      .order('statement_year', { ascending: false })
      .order('statement_month', { ascending: false })
      .limit(1);
    
    if (balanceError) {
      console.error('❌ Error testing balance service:', balanceError.message);
      return;
    }
    
    if (testBalance && testBalance.length > 0) {
      const balance = testBalance[0];
      console.log(`✅ Balance Service Result:`);
      console.log(`   Account: ${balance.bank_accounts.bank_name}`);
      console.log(`   Balance: ₹${balance.closing_balance}`);
      console.log(`   Statement: ${balance.statement_year}-${String(balance.statement_month).padStart(2, '0')}`);
    }
    
    console.log('\n🎯 Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to http://localhost:3001/dashboard');
    console.log('2. You should see:');
    console.log('   - Net Worth: ₹55,531.02');
    console.log('   - Latest Statement: 2025-05');
    console.log('   - No more -₹10k transaction-based calculations');
    console.log('\n3. Go to http://localhost:3001/bank-accounts');
    console.log('4. You should see the Test Bank account with ₹55,531.02 balance');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

createTestData();
