const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function runMigration() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const migrationFile = process.argv[2];

    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL not found in .env.local');
        return;
    }

    if (!migrationFile) {
        console.error('❌ Error: Please provide a migration filename (e.g., node scripts/migrate-direct.js my_migration.sql)');
        return;
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();

        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
        console.log(`Reading migration file: ${migrationPath}`);

        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`);
            return;
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);

        console.log('✅ Migration applied successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
