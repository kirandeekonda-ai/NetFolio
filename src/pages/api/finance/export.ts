import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Use Supabase client with service role key — works in both local and production (Vercel)
// The old raw `pg` connection was failing on Vercel because DATABASE_URL / POSTGRES_URL
// was not available or blocked by Supabase's serverless connection rules.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        console.log('Exporting for user:', userId);

        // Fetch holdings
        const { data: holdings, error: holdingsError } = await supabaseAdmin
            .from('investments_holdings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (holdingsError) {
            console.error('Holdings fetch error:', holdingsError);
            throw new Error(holdingsError.message);
        }

        console.log('Holdings fetched:', holdings?.length || 0);

        // Fetch transactions
        const { data: transactions, error: txError } = await supabaseAdmin
            .from('investment_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (txError) {
            console.error('Transactions fetch error:', txError);
            throw new Error(txError.message);
        }

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
            ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
        });

        const holdingsCsv = [
            holdingsHeaders.join(','),
            ...holdingsRows
        ].join('\n');

        // Generate Transactions CSV
        const transactionsHeaders = [
            'Date', 'Investment Name', 'Holding ID', 'Type', 'Quantity', 'Price Per Unit', 'Total Amount', 'Fees', 'Notes'
        ];

        // Build a map of holdingId -> name for richer transaction CSV
        const holdingNameMap: Record<string, string> = {};
        (holdings || []).forEach(h => { holdingNameMap[h.id] = h.name || ''; });

        const transactionsRows = (transactions || []).map(t => [
            t.date || '',
            holdingNameMap[t.holding_id] || '',
            t.holding_id || '',
            t.type || '',
            t.quantity?.toString() || '0',
            t.price_per_unit?.toString() || '0',
            (Number(t.quantity) * Number(t.price_per_unit)).toFixed(2),
            t.fees?.toString() || '0',
            t.notes || ''
        ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

        const transactionsCsv = [
            transactionsHeaders.join(','),
            ...transactionsRows
        ].join('\n');

        console.log('CSV generated — Holdings:', holdingsRows.length, 'Transactions:', transactionsRows.length);

        return res.status(200).json({
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
        return res.status(500).json({ error: error.message || 'Export failed' });
    }
}
