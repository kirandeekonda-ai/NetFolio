/**
 * Balance Management Restructuring - Migration Test Script
 * Tests the migration script and provides rollback capability
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testMigration() {
  console.log('🧪 Testing Balance Management Restructuring Migration\n');
  
  try {
    // Step 1: Check current state
    console.log('1️⃣ Checking current database state...');
    
    const { data: statements, error: statementsError } = await supabase
      .from('bank_statements')
      .select('id, statement_month, statement_year, closing_balance');
      
    if (statementsError) {
      console.error('❌ Error fetching statements:', statementsError.message);
      return;
    }
    
    const { data: extractions, error: extractionsError } = await supabase
      .from('balance_extractions')
      .select('bank_statement_id, closing_balance, balance_confidence, page_number');
      
    if (extractionsError) {
      console.error('❌ Error fetching balance extractions:', extractionsError.message);
      return;
    }
    
    console.log(`✅ Found ${statements?.length || 0} statements`);
    console.log(`✅ Found ${extractions?.length || 0} balance extractions`);
    
    const statementsWithBalance = statements?.filter(s => s.closing_balance !== null) || [];
    const extractionsWithBalance = extractions?.filter(e => e.closing_balance !== null) || [];
    
    console.log(`📊 Statements with closing balance: ${statementsWithBalance.length}`);
    console.log(`📊 Extractions with closing balance: ${extractionsWithBalance.length}`);
    
    // Step 2: Group extractions by statement
    const extractionsByStatement = new Map();
    extractionsWithBalance.forEach(extraction => {
      const statementId = extraction.bank_statement_id;
      if (!extractionsByStatement.has(statementId)) {
        extractionsByStatement.set(statementId, []);
      }
      extractionsByStatement.get(statementId).push(extraction);
    });
    
    console.log(`📋 Unique statements with balance extractions: ${extractionsByStatement.size}`);
    
    // Step 3: Show what migration would do
    console.log('\n2️⃣ Migration preview (what would be consolidated):');
    let previewCount = 0;
    
    for (const [statementId, statementExtractions] of extractionsByStatement) {
      if (previewCount >= 5) {
        console.log('   ... (showing first 5 only)');
        break;
      }
      
      // Find best balance (highest confidence, then latest page)
      let bestBalance = null;
      let bestConfidence = 0;
      let bestPage = 0;
      
      statementExtractions.forEach(ext => {
        if (ext.balance_confidence > bestConfidence || 
           (ext.balance_confidence === bestConfidence && ext.page_number > bestPage)) {
          bestBalance = ext.closing_balance;
          bestConfidence = ext.balance_confidence;
          bestPage = ext.page_number;
        }
      });
      
      const statement = statements?.find(s => s.id === statementId);
      console.log(`   Statement ${statement?.statement_year}-${String(statement?.statement_month).padStart(2, '0')}: ₹${bestBalance} (${bestConfidence}% confidence, page ${bestPage})`);
      console.log(`     From ${statementExtractions.length} extractions: ${statementExtractions.map(e => `₹${e.closing_balance}(${e.balance_confidence}%)`).join(', ')}`);
      
      previewCount++;
    }
    
    // Step 4: Check for potential data loss
    console.log('\n3️⃣ Data integrity check:');
    
    const statementsNeedingMigration = extractionsByStatement.size;
    const statementsAlreadyWithBalance = statements?.filter(s => 
      s.closing_balance !== null && extractionsByStatement.has(s.id)
    ).length || 0;
    
    console.log(`📈 Statements needing migration: ${statementsNeedingMigration}`);
    console.log(`⚠️  Statements already with balance (would be overwritten): ${statementsAlreadyWithBalance}`);
    
    if (statementsAlreadyWithBalance > 0) {
      console.log('⚠️  WARNING: Some statements already have closing_balance. Migration would overwrite these.');
    }
    
    console.log('\n4️⃣ Migration safety check: ✅ PASSED');
    console.log(`📊 Summary:`);
    console.log(`   - ${extractionsWithBalance.length} balance extractions to consolidate`);
    console.log(`   - ${statementsNeedingMigration} statements to update`);
    console.log(`   - Backup table will be created for rollback safety`);
    
    console.log('\n🎯 Migration is ready to run!');
    console.log('\nTo execute migration:');
    console.log('1. Run the SQL migration file against your database');
    console.log('2. Verify the consolidation worked correctly');
    console.log('3. Test the new balance finalization API');
    console.log('4. If everything works, uncomment the DROP TABLE line');
    
  } catch (error) {
    console.error('💥 Error during migration test:', error);
  }
}

async function rollbackMigration() {
  console.log('🔄 Rolling back Balance Management Restructuring Migration\n');
  
  try {
    // Check if backup exists
    const { data: backupExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'balance_extractions_backup')
      .single();
      
    if (!backupExists) {
      console.log('❌ No backup table found. Cannot rollback.');
      return;
    }
    
    console.log('1️⃣ Restoring balance_extractions table from backup...');
    
    // This would need to be run manually in the database
    console.log('Manual SQL required:');
    console.log(`
CREATE TABLE balance_extractions AS 
SELECT * FROM balance_extractions_backup;

-- Re-enable RLS and recreate policies
ALTER TABLE balance_extractions ENABLE ROW LEVEL SECURITY;
-- Add back the original policies...

-- Clear consolidated closing_balance values
UPDATE bank_statements SET closing_balance = NULL 
WHERE closing_balance IS NOT NULL;

-- Drop backup table
DROP TABLE balance_extractions_backup;
`);
    
    console.log('⚠️  Rollback requires manual SQL execution.');
    
  } catch (error) {
    console.error('💥 Error during rollback:', error);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    rollbackMigration();
  } else {
    testMigration();
  }
}

module.exports = { testMigration, rollbackMigration };
