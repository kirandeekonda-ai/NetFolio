const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './financial-tracker/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSampleData() {
  try {
    console.log('Adding sample transactions...');
    
    // Get the first user (or create one for testing)
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    
    if (!users.users.length) {
      console.log('No users found. Please sign up first at http://localhost:3001/auth/landing');
      return;
    }
    
    const userId = users.users[0].id;
    console.log('Using user ID:', userId);
    
    // Sample transactions for this month with categories
    const currentDate = new Date();
    const sampleTransactions = [
      {
        user_id: userId,
        bank_account_id: 'sample_account_1',
        description: 'Grocery Store - Weekly Shopping',
        amount: -85.50,
        transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15).toISOString(),
        transaction_type: 'expense',
        category_name: 'Groceries',
        category_id: 'cat_groceries'
      },
      {
        user_id: userId,
        bank_account_id: 'sample_account_1',
        description: 'Gas Station - Fuel',
        amount: -45.00,
        transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 12).toISOString(),
        transaction_type: 'expense',
        category_name: 'Transportation',
        category_id: 'cat_transport'
      },
      {
        user_id: userId,
        bank_account_id: 'sample_account_1',
        description: 'Coffee Shop',
        amount: -6.75,
        transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 10).toISOString(),
        transaction_type: 'expense',
        category_name: 'Dining',
        category_id: 'cat_dining'
      },
      {
        user_id: userId,
        bank_account_id: 'sample_account_1',
        description: 'Salary Deposit',
        amount: 3500.00,
        transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
        transaction_type: 'income',
        category_name: 'Salary',
        category_id: 'cat_salary'
      },
      {
        user_id: userId,
        bank_account_id: 'sample_account_1',
        description: 'Netflix Subscription',
        amount: -15.99,
        transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8).toISOString(),
        transaction_type: 'expense',
        category_name: 'Entertainment',
        category_id: 'cat_entertainment'
      }
    ];
    
    // Delete existing sample data first
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .in('description', sampleTransactions.map(t => t.description));
    
    // Insert new sample data
    const { data, error } = await supabase
      .from('transactions')
      .insert(sampleTransactions);
    
    if (error) {
      console.error('Error inserting sample data:', error);
      return;
    }
    
    console.log('Sample data added successfully!');
    console.log(`Added ${sampleTransactions.length} transactions for user ${userId}`);
    
    // Verify the data
    const { data: verification, error: verifyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .limit(10);
      
    if (verifyError) {
      console.error('Error verifying data:', verifyError);
    } else {
      console.log('Verification - transactions in database:', verification.length);
      console.log('Sample transaction:', verification[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addSampleData();
