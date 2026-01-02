import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Use direct database connection like the import script
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        console.log('Exporting for user:', userId);

        await client.connect();

        // Fetch holdings using direct SQL
        const holdingsResult = await client.query(
            `SELECT * FROM investments_holdings WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        const holdings = holdingsResult.rows;

        console.log('Holdings fetched:', holdings?.length || 0);

        // Fetch transactions using direct SQL
        const transactionsResult = await client.query(
            `SELECT * FROM investment_transactions WHERE user_id = $1 ORDER BY date DESC`,
            [userId]
        );
        const transactions = transactionsResult.rows;

        console.log('Transactions fetched:', transactions?.length || 0);

        // Generate Holdings CSV
        const holdingsHeaders = [
            'Holder Name', 'Investment Name', 'Ticker Symbol', 'Asset Class', 'Sector',
            'Strategy Bucket', 'Quantity', 'Avg Price', 'Current Price', 'Invested Amount',
            'Current Value', 'P&L Amount', 'P&L %', 'Investment Date', 'Last Price Update'
        ];

        const holdingsRows = (holdings || []).map(h => {
            const investedAmount = Number(h.quantity) * Number(h.avg_price);
            const currentValue = Number(h.quantity) * (Number(h.current_price) || Number(h.avg_price));
            const pnlAmount = currentValue - investedAmount;
            const pnlPercent = investedAmount > 0 ? (pnlAmount / investedAmount) * 100 : 0;

            return [
                h.holder_name || '',
                h.name || '',
                h.ticker_symbol || '',
                h.asset_class || '',
                h.sector || '',
                h.strategy_bucket || '',
                h.quantity?.toString() || '0',
                h.avg_price?.toString() || '0',
                (h.current_price || h.avg_price)?.toString() || '0',
                investedAmount.toFixed(2),
                currentValue.toFixed(2),
                pnlAmount.toFixed(2),
                pnlPercent.toFixed(2),
                h.investment_date || h.created_at || '',
                h.last_price_update || ''
            ].map(cell => `"${cell}"`).join(',');
        });

        const holdingsCsv = [
            holdingsHeaders.join(','),
            ...holdingsRows
        ].join('\n');

        // Generate Transactions CSV
        const transactionsHeaders = [
            'Date', 'Holding ID', 'Type', 'Quantity', 'Price Per Unit', 'Total Amount', 'Fees', 'Notes'
        ];

        const transactionsRows = (transactions || []).map(t => [
            t.date || '',
            t.holding_id || '',
            t.type || '',
            t.quantity?.toString() || '0',
            t.price_per_unit?.toString() || '0',
            (Number(t.quantity) * Number(t.price_per_unit)).toFixed(2),
            t.fees?.toString() || '0',
            t.notes || ''
        ].map(cell => `"${cell}"`).join(','));

        const transactionsCsv = [
            transactionsHeaders.join(','),
            ...transactionsRows
        ].join('\n');

        console.log('CSV generated - Holdings rows:', holdingsRows.length, 'Transactions rows:', transactionsRows.length);

        await client.end();

        // Return both CSVs as JSON
        res.status(200).json({
            holdings: holdingsCsv,
            transactions: transactionsCsv,
            timestamp: new Date().toISOString(),
            stats: {
                holdingsCount: holdings?.length || 0,
                transactionsCount: transactions?.length || 0
            }
        });

    } catch (error: any) {
        console.error('Export error:', error);
        await client.end();
        res.status(500).json({ error: error.message || 'Export failed' });
    }
}
