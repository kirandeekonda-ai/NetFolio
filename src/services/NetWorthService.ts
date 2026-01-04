import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import simplifiedBalanceService from './SimplifiedBalanceService';
import { investmentService } from './InvestmentService';

export interface NetWorthHistoryPoint {
    date: string;       // ISO Date YYYY-MM-DD
    cashBalance: number;
    investedAmount: number;
    total: number;
}

export interface NetWorthSnapshot {
    totalNetWorth: number;
    cashTotal: number;
    investmentsTotal: number;
    allocation: {
        cash: number;       // Percentage
        investments: number; // Percentage
    };
    history: NetWorthHistoryPoint[];
}

class NetWorthService {
    private supabase = createClientComponentClient();

    /**
     * Get complete Net Worth snapshot including history trend
     */
    async getNetWorthData(userId: string): Promise<NetWorthSnapshot> {
        try {
            // 1. Fetch Current Totals (Live Market Value)
            // -------------------------------------------

            // Banks
            const accounts = await simplifiedBalanceService.getAccountBalances(userId);
            const cashTotal = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

            // Investments
            const holdings = await investmentService.getHoldings(userId);
            const investmentsTotal = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);

            const totalNetWorth = cashTotal + investmentsTotal;

            // 2. Build History (Trend)
            // ------------------------
            const history = await this.buildHistory(userId, accounts);

            return {
                totalNetWorth,
                cashTotal,
                investmentsTotal,
                allocation: {
                    cash: totalNetWorth > 0 ? (cashTotal / totalNetWorth) * 100 : 0,
                    investments: totalNetWorth > 0 ? (investmentsTotal / totalNetWorth) * 100 : 0
                },
                history
            };

        } catch (error) {
            console.error('Error fetching Net Worth data:', error);
            throw error;
        }
    }

    private async buildHistory(userId: string, accounts: any[]): Promise<NetWorthHistoryPoint[]> {
        // A. Fetch Bank History for ALL accounts
        const bankHistories = await Promise.all(
            accounts.map(async (acc) => {
                const h = await simplifiedBalanceService.getBalanceHistory(acc.account_id);
                return { accountId: acc.account_id, history: h }; // h is sorted DESC usually
            })
        );

        // B. Fetch Investment Transactions (for cumulative invested amount)
        const { data: transactions } = await this.supabase
            .from('investment_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: true }); // ASC for cumulative sum

        // C. Generate Time Series (Daily for last 1 year or since first data point)
        // Find earliest date
        let minDateTs = Date.now();

        bankHistories.forEach(bh => {
            if (bh.history.length > 0) {
                const last = bh.history[bh.history.length - 1]; // Oldest (since usually Returned DESC? Check service)
                // SimplifiedBalanceService.getBalanceHistory sorts DESC (ORDER BY balance_date DESC)
                // So last item is oldest.
                const ts = new Date(last.date).getTime();
                if (ts < minDateTs) minDateTs = ts;
            }
        });

        if (transactions && transactions.length > 0) {
            const firstTx = transactions[0];
            const ts = new Date(firstTx.date).getTime();
            if (ts < minDateTs) minDateTs = ts;
        }

        // If no data, return empty
        if (minDateTs === Date.now()) return [];

        // Determine Start Date (Max 2 years back to keep chart readable, or full duration?)
        // Let's use full duration but clamp to sensible default if empty.
        const startDate = new Date(minDateTs);
        const endDate = new Date();
        const trend: NetWorthHistoryPoint[] = [];

        // Helper maps
        // AccountID -> Sorted History (ASC for easier processing)
        const accountTimeLines: Record<string, { date: number, amount: number }[]> = {};
        bankHistories.forEach(bh => {
            // Sort ASC for forward fill logic
            accountTimeLines[bh.accountId] = [...bh.history]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(item => ({ date: new Date(item.date).getTime(), amount: item.amount }));
        });

        // Investment Transactions sorted ASC
        const processedTx = (transactions || []).map(tx => ({
            date: new Date(tx.date).getTime(),
            amount: (tx.type === 'buy' ? 1 : -1) * Number(tx.quantity) * Number(tx.price_per_unit)
        }));

        // Loop Day by Day
        const currentBalances: Record<string, number> = {};
        let currentInvested = 0;
        let txIndex = 0;

        // Create timeline
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const todayTs = d.getTime();
            const dateStr = d.toISOString().split('T')[0];

            // 1. Update Bank Balances
            // For each account, find the latest balance ON or BEFORE today
            let totalCash = 0;

            Object.keys(accountTimeLines).forEach(accId => {
                const line = accountTimeLines[accId];
                // Find last entry <= todayTs
                // Optimization: store index per account if slow, but array is small enough.
                // Simple reverse find or maintain pointer? Pointer is better.
                // Actually, let's just find "last known".

                // Better Forward Fill:
                // Find all entries on this exact date and update currentBalances
                const entriesToday = line.filter(l => l.date === todayTs); // Problem: exact ms match? 
                // Using normalized dates for comparison is safer

                // Let's rely on filter by Date String comparison if normalized
                // Or just: find last entry <= today
                let lastKnown = 0;
                // Optimization: Since we strictly move forward in time (d++), 
                // we can just check if the "next" balance update is <= today.

                // Let's use a simpler approach: Re-eval totalCash every day is expensive.
                // Instead, update state when date is crossed.
            });
        }

        // --- Optimized Timeline Construction ---

        // 1. Collect all "Event Dates" (Balance Change or Tx)
        const eventDates = new Set<string>();
        bankHistories.forEach(bh => bh.history.forEach(h => eventDates.add(h.date.split('T')[0])));
        transactions?.forEach(tx => eventDates.add(tx.date.split('T')[0]));
        eventDates.add(new Date().toISOString().split('T')[0]); // Add today

        const sortedUniqueDates = Array.from(eventDates).sort();

        // If very sparse, interpolate? 
        // For a smooth chart, we usually want daily points, or at least sparse points connected.
        // Let's stick to DAILY for the chart to look smooth.

        // Re-implement Daily Loop with efficient Pointers
        const accPointers: Record<string, number> = {}; // Index in accountTimeLines
        accounts.forEach(a => accPointers[a.account_id] = 0);

        let cumulativeInvested = 0;
        let txPtr = 0;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const currentDateStr = d.toISOString().split('T')[0];
            const currentTs = d.getTime();

            // Update Cash from Banks
            let dailyCash = 0;
            Object.keys(accountTimeLines).forEach(accId => {
                const timeline = accountTimeLines[accId];
                let ptr = accPointers[accId];

                // Advance pointer until we find the last entry <= today
                while (ptr < timeline.length && timeline[ptr].date <= currentTs) {
                    ptr++;
                }
                // ptr is now at the first entry > today, or length.
                // So effective balance is at ptr-1
                accPointers[accId] = ptr; // Keep for next day (optimization)

                if (ptr > 0) {
                    dailyCash += timeline[ptr - 1].amount;
                }
            });

            // Update Investments
            while (txPtr < processedTx.length && processedTx[txPtr].date <= currentTs) {
                cumulativeInvested += processedTx[txPtr].amount;
                txPtr++;
            }

            trend.push({
                date: currentDateStr,
                cashBalance: dailyCash,
                investedAmount: cumulativeInvested,
                total: dailyCash + cumulativeInvested
            });
        }

        // Downsample if too large? 1 year = 365 points. Fine for Recharts.
        return trend;
    }
}

export const netWorthService = new NetWorthService();
