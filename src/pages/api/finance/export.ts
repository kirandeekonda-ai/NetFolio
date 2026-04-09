import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Use the user's own auth session (reads cookies) — works in local + production
    // without needing any service role key or direct DB URL.
    const supabase = createServerSupabaseClient({ req, res });

    try {
        // Verify the session is valid
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const userId = session.user.id;
        console.log('Exporting for user:', userId);

        // Fetch holdings
        const { data: holdings, error: holdingsError } = await supabase
            .from('investments_holdings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (holdingsError) {
            console.error('Holdings fetch error:', holdingsError);
            throw new Error(holdingsError.message);
        }

        console.log('Holdings fetched:', holdings?.length ?? 0);

        // Fetch transactions
        const { data: transactions, error: txError } = await supabase
            .from('investment_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (txError) {
            console.error('Transactions fetch error:', txError);
            throw new Error(txError.message);
        }

        console.log('Transactions fetched:', transactions?.length ?? 0);

        // Generate Holdings CSV
        const holdingsHeaders = [
            'Holder Name', 'Investment Name', 'Ticker Symbol', 'Asset Class', 'Sector',
            'Strategy Bucket', 'Quantity', 'Avg Price', 'Current Price', 'Invested Amount',
            'Current Value', 'P&L Amount', 'P&L %', 'Investment Date', 'Last Price Update'
        ];

        const escapeCell = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

        const holdingsRows = (holdings ?? []).map(h => {
            const investedAmount = Number(h.quantity) * Number(h.avg_price);
            const currentValue = Number(h.quantity) * (Number(h.current_price) || Number(h.avg_price));
            const pnlAmount = currentValue - investedAmount;
            const pnlPercent = investedAmount > 0 ? (pnlAmount / investedAmount) * 100 : 0;

            return [
                h.holder_name,
                h.name,
                h.ticker_symbol,
                h.asset_class,
                h.sector,
                h.strategy_bucket,
                h.quantity,
                h.avg_price,
                h.current_price || h.avg_price,
                investedAmount.toFixed(2),
                currentValue.toFixed(2),
                pnlAmount.toFixed(2),
                pnlPercent.toFixed(2),
                h.investment_date || h.created_at,
                h.last_price_update
            ].map(escapeCell).join(',');
        });

        const holdingsCsv = [holdingsHeaders.join(','), ...holdingsRows].join('\n');

        // Build holding ID → name map for richer transaction export
        const holdingNameMap: Record<string, string> = {};
        (holdings ?? []).forEach(h => { holdingNameMap[h.id] = h.name ?? ''; });

        // Generate Transactions CSV
        const transactionsHeaders = [
            'Date', 'Investment Name', 'Holding ID', 'Type',
            'Quantity', 'Price Per Unit', 'Total Amount', 'Fees', 'Notes'
        ];

        const transactionsRows = (transactions ?? []).map(t => [
            t.date,
            holdingNameMap[t.holding_id],
            t.holding_id,
            t.type,
            t.quantity,
            t.price_per_unit,
            (Number(t.quantity) * Number(t.price_per_unit)).toFixed(2),
            t.fees ?? 0,
            t.notes
        ].map(escapeCell).join(','));

        const transactionsCsv = [transactionsHeaders.join(','), ...transactionsRows].join('\n');

        console.log('CSV generated — Holdings:', holdingsRows.length, 'Transactions:', transactionsRows.length);

        return res.status(200).json({
            holdings: holdingsCsv,
            transactions: transactionsCsv,
            timestamp: new Date().toISOString(),
            stats: {
                holdingsCount: holdings?.length ?? 0,
                transactionsCount: transactions?.length ?? 0
            }
        });

    } catch (error: any) {
        console.error('Export error:', error);
        return res.status(500).json({ error: error.message || 'Export failed' });
    }
}
