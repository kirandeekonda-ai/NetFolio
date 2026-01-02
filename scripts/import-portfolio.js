const fs = require('fs');
const { Client } = require('pg');
const { default: YahooFinance } = require('yahoo-finance2');
const symbolMapping = require('./symbol_mapping');
const path = require('path');
const dotenv = require('dotenv');

// Initialize Yahoo Finance
const yahooFinance = new YahooFinance();

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

// Suppress unique survey warning
// yahooFinance.suppressNotices(['yahooSurvey']);

// Use the absolute path to the user's file
const CSV_FILE_PATH = 'c:\\Users\\Kiran\\Downloads\\Kiran Family BalanceSheet - Portfolio New.csv';
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const USER_ID = 'b5326bf8-9595-4d45-9419-3f5897d372d3'; // kiran4201.subscribe@gmail.com

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resolveSymbol(googleCode, name) {
    // 1. Check direct mapping
    if (symbolMapping.hasOwnProperty(googleCode)) {
        const mapped = symbolMapping[googleCode];
        if (mapped === null) {
            console.warn(`⚠️  Skipping ${googleCode} (${name}) - Marked as not available.`);
            return null;
        }
        return mapped;
    }
    // 2. Default fallback
    console.log(`ℹ️  No mapping found for ${googleCode}. Trying ${googleCode}.NS...`);
    return `${googleCode}.NS`;
}

async function processRow(row) {
    const [
        Person, InvestmentName, Category, SubCategory, Bucket, GoogleCode, UnitsStr, EntryPriceStr, EntryDate
    ] = row;

    if (!InvestmentName || !UnitsStr || !GoogleCode) return false; // validation

    const quantity = parseFloat(UnitsStr);
    const costBasis = parseFloat(EntryPriceStr);

    if (isNaN(quantity) || quantity <= 0) return false;

    const tickerSymbol = await resolveSymbol(GoogleCode, InvestmentName);
    if (!tickerSymbol) return false;

    // --- Yahoo Finance API Call ---
    let matchedName = InvestmentName;
    let currentPrice = null;
    let lastPriceUpdate = null;
    let sector = SubCategory || 'Other'; // Fallback to CSV
    let assetClass = Category; // Fallback to CSV

    try {
        const summary = await yahooFinance.quoteSummary(tickerSymbol, {
            modules: ['assetProfile', 'price', 'quoteType']
        });

        if (summary) {
            // Get name from price module
            matchedName = summary.price?.longName || summary.price?.shortName || InvestmentName;
            currentPrice = summary.price?.regularMarketPrice;
            lastPriceUpdate = summary.price?.regularMarketTime ?
                (summary.price.regularMarketTime instanceof Date ?
                    summary.price.regularMarketTime.toISOString() :
                    new Date(summary.price.regularMarketTime).toISOString()) : null;

            // Get sector/industry from assetProfile
            sector = summary.assetProfile?.sector || summary.assetProfile?.industry || SubCategory || 'Other';

            // Map Yahoo quoteType to asset class
            if (summary.quoteType?.quoteType) {
                const quoteTypeMap = {
                    'EQUITY': 'Equity',
                    'ETF': 'ETF',
                    'MUTUALFUND': 'Mutual Fund',
                    'INDEX': 'Index',
                    'CRYPTOCURRENCY': 'Crypto'
                };
                assetClass = quoteTypeMap[summary.quoteType.quoteType] || Category;
            }

            console.log(`✅  ${matchedName} | ${assetClass} | ${sector}`);
        }
    } catch (e) {
        console.warn(`⚠️  Yahoo failed for ${tickerSymbol}, using CSV data`);
    }

    try {
        // Check existing holding using direct SQL
        const res = await client.query(
            `SELECT * FROM investments_holdings WHERE ticker_symbol = $1 AND user_id = $2`,
            [tickerSymbol, USER_ID]
        );

        let holdingId;

        if (res.rows.length > 0) {
            // Update existing
            const holding = res.rows[0];
            holdingId = holding.id;

            const oldQty = Number(holding.quantity) || 0;
            const oldAvg = Number(holding.avg_price) || 0;
            const newQty = oldQty + quantity;
            const totalCost = (oldQty * oldAvg) + (quantity * costBasis);
            const newAvgPrice = totalCost / newQty;

            await client.query(
                `UPDATE investments_holdings SET 
                    quantity = $1, 
                    avg_price = $2, 
                    current_price = COALESCE($3, current_price),
                    last_price_update = COALESCE($4, last_price_update),
                    updated_at = NOW()
                WHERE id = $5`,
                [newQty, newAvgPrice, currentPrice, lastPriceUpdate, holdingId]
            );
            console.log(`🔄 Updated ${matchedName} (${tickerSymbol})`);
        } else {
            // Insert new
            const insertRes = await client.query(
                `INSERT INTO investments_holdings (
                    user_id, holder_name, name, ticker_symbol, quantity, avg_price,
                    current_price, last_price_update, asset_class, sector, strategy_bucket, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING id`,
                [
                    USER_ID, Person || 'Unknown', matchedName, tickerSymbol, quantity, costBasis,
                    currentPrice, lastPriceUpdate, assetClass, sector, Bucket
                ]
            );
            holdingId = insertRes.rows[0].id;
            console.log(`✨ Inserted ${matchedName} (${tickerSymbol})`);
        }

        // Insert Transaction
        if (EntryDate && holdingId) {
            await client.query(
                `INSERT INTO investment_transactions (
                    holding_id, user_id, type, quantity, price_per_unit, date, created_at
                ) VALUES ($1, $2, 'buy', $3, $4, $5, NOW())`,
                [holdingId, USER_ID, quantity, costBasis, new Date(EntryDate).toISOString()]
            );
        }
        return { success: true };
    } catch (dbErr) {
        return {
            success: false,
            symbol: tickerSymbol,
            name: InvestmentName,
            error: dbErr.message
        };
    }
}

async function run() {
    console.log('🚀 Starting Full Portfolio Import...\n');
    await client.connect();

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error('❌ File not found:', CSV_FILE_PATH);
        await client.end();
        return;
    }

    const rows = fs.readFileSync(CSV_FILE_PATH, 'utf-8')
        .split('\n')
        .map(r => r.trim())
        .filter(r => r && !r.startsWith('Person'));

    const failures = [];
    let successCount = 0;
    let rowNum = 0;

    for (const rowStr of rows) {
        rowNum++;
        process.stdout.write(`\rProcessing ${rowNum}/${rows.length}...`);

        const result = await processRow(rowStr.split(','));

        if (result.success) {
            successCount++;
        } else if (result.symbol) {
            failures.push(result);
        }

        await new Promise(r => setTimeout(r, 100)); // Throttle API calls
    }

    console.log('\n\n📊 Import Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failures.length}`);
    console.log(`📝 Total Processed: ${rows.length}\n`);

    if (failures.length > 0) {
        const failedCsv = 'Symbol,Name,Error\n' +
            failures.map(f => `${f.symbol},"${f.name}","${f.error}"`).join('\n');

        fs.writeFileSync('failed_imports.csv', failedCsv);
        console.log('📄 Failed entries saved to: failed_imports.csv\n');

        console.log('Failed entries:');
        failures.forEach(f => {
            console.log(`  ❌ ${f.symbol} (${f.name}): ${f.error}`);
        });
    }

    await client.end();
    console.log('\n✅ Import Complete!');
}

run();
