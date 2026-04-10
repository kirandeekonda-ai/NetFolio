import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { InvestmentHolding, InvestmentTransaction, FinanceDashboardData } from '@/types/finance';
import { calculateXIRR, calculateCAGR } from '@/utils/financeCalculations';



class InvestmentService {
    private supabase = createClientComponentClient();

    /**
     * Fetch all holdings for a user, optionally filtered by holder_name
     */
    async getHoldings(userId: string, holderFilter?: string): Promise<InvestmentHolding[]> {
        try {
            let query = this.supabase
                .from('investments_holdings')
                .select('*, investment_transactions(*)')
                .eq('user_id', userId)
                .order('name');

            if (holderFilter && holderFilter !== 'All') {
                query = query.eq('holder_name', holderFilter);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching holdings:', error);
                return [];
            }

            // Calculate computed fields
            return (data || []).map((holding: any) => this.enrichHoldingData(holding));
        } catch (error) {
            console.error('Error in getHoldings:', error);
            return [];
        }
    }

    /**
     * Enrich holding data with calculated fields (Market Value, P&L)
     */
    private enrichHoldingData(holding: any): InvestmentHolding {
        const transactions: any[] = holding.investment_transactions || [];

        // Always derive quantity + avg_price from transaction history when available.
        // The stored `quantity` column can drift if rows were edited directly or added manually.
        let quantity: number;
        let avgPrice: number;

        if (transactions.length > 0) {
            let totalQty = 0;
            let totalCost = 0;
            transactions.forEach((tx: any) => {
                if (tx.type === 'buy') {
                    totalQty += Number(tx.quantity);
                    totalCost += Number(tx.quantity) * Number(tx.price_per_unit);
                } else if (tx.type === 'sell') {
                    const currentAvg = totalQty > 0 ? totalCost / totalQty : 0;
                    totalQty -= Number(tx.quantity);
                    totalCost -= Number(tx.quantity) * currentAvg;
                    if (totalQty <= 0) { totalQty = 0; totalCost = 0; }
                }
            });
            quantity = totalQty;
            avgPrice = totalQty > 0 ? totalCost / totalQty : Number(holding.avg_price);
        } else {
            // No transactions recorded — fall back to stored columns
            quantity = Number(holding.quantity);
            avgPrice = Number(holding.avg_price);
        }

        const currentPrice = Number(holding.current_price) || avgPrice;
        const investedAmount = quantity * avgPrice;
        const currentValue = quantity * currentPrice;
        const pnlAmount = currentValue - investedAmount;
        const pnlPercentage = investedAmount > 0 ? (pnlAmount / investedAmount) * 100 : 0;

        // Use earliest transaction date as investment date
        let investmentDate = new Date(holding.investment_date);
        if (transactions.length > 0) {
            const earliest = transactions.reduce((a: any, b: any) =>
                new Date(a.date) < new Date(b.date) ? a : b
            );
            investmentDate = new Date(earliest.date);
        }
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - investmentDate.getTime());
        const daysHeld = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            ...holding,
            investment_date: investmentDate.toISOString(),
            quantity,
            avg_price: avgPrice,
            current_price: currentPrice,
            invested_amount: investedAmount,
            current_value: currentValue,
            pnl_amount: pnlAmount,
            pnl_percentage: pnlPercentage,
            days_held: daysHeld,
            xirr: this.calculateHoldingXIRR(holding, currentValue),
            cagr: this.calculateHoldingCAGR(investedAmount, currentValue, investmentDate),
            transactions: transactions.sort((a: any, b: any) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
        };
    }

    /**
     * Calculate portfolio-level metrics
     */
    /**
     * Calculate portfolio-level metrics
     */
    calculateMetrics(holdings: InvestmentHolding[]): FinanceDashboardData['metrics'] {
        let totalInvested = 0;
        let currentValue = 0;
        let totalDayChange = 0;

        holdings.forEach(h => {
            totalInvested += h.invested_amount || 0;
            currentValue += h.current_value || 0;
            totalDayChange += h.day_change_amount || 0;
        });

        const totalPnl = currentValue - totalInvested;
        const totalPnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

        // Day Change % is based on (Current Value - Day Change) i.e., Yesterday's Value
        const yesterdayValue = currentValue - totalDayChange;
        const totalDayChangePercentage = yesterdayValue > 0 ? (totalDayChange / yesterdayValue) * 100 : 0;

        return {
            total_invested: totalInvested,
            current_value: currentValue,
            total_pnl: totalPnl,
            total_pnl_percentage: totalPnlPercentage,
            day_change_amount: totalDayChange,
            day_change_percentage: totalDayChangePercentage
        };
    }

    /**
     * Helper to calculate XIRR for a single holding
     */
    /**
     * Helper to calculate XIRR for a single holding
     */
    private calculateHoldingXIRR(holding: any, currentValue: number): number | undefined {
        let cashFlows: { amount: number, date: Date }[] = [];
        const transactions = holding.investment_transactions;

        if (transactions && transactions.length > 0) {
            // Case 1: Use detailed transaction history
            cashFlows = transactions.map((tx: any) => ({
                amount: tx.type === 'buy' ? -Number(tx.price_per_unit) * Number(tx.quantity)
                    : (tx.type === 'sell' ? Number(tx.price_per_unit) * Number(tx.quantity) : 0),
                date: new Date(tx.date)
            })).filter((cf: any) => cf.amount !== 0);
        } else if (holding.investment_date && holding.quantity && holding.avg_price) {
            // Case 2: Fallback - Use investment date and average price as a single initial BUY
            const investedAmount = Number(holding.quantity) * Number(holding.avg_price);
            if (investedAmount > 0) {
                cashFlows.push({
                    amount: -investedAmount,
                    date: new Date(holding.investment_date)
                });
            }
        } else {
            return undefined;
        }

        // Add current value as a positive cash flow (theoretical sell today)
        if (currentValue > 0) {
            cashFlows.push({
                amount: currentValue,
                date: new Date()
            });
        }

        const result = calculateXIRR(cashFlows);
        return result !== null ? result : undefined;
    }

    /**
     * Helper to calculate CAGR for a single holding
     */
    private calculateHoldingCAGR(investedAmount: number, currentValue: number, investmentDate: Date): number | undefined {
        const result = calculateCAGR(investedAmount, currentValue, investmentDate);
        return result !== null ? result : undefined;
    }

    /**
     * Add a new BUY transaction (simplistic implementation)
     * In a real app, this should run inside a DB transaction to update 'holdings' + insert 'transaction'
     */
    async addTransaction(transaction: Omit<InvestmentTransaction, 'id' | 'created_at' | 'holding_id' | 'user_id'>, holdingDetails: Partial<InvestmentHolding>): Promise<boolean> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            // 1. Find or create the holding
            const { data: existingHolding } = await this.supabase
                .from('investments_holdings')
                .select('*')
                .eq('user_id', user.id)
                .eq('ticker_symbol', holdingDetails.ticker_symbol)
                .eq('holder_name', holdingDetails.holder_name)
                .single();

            let holdingId = existingHolding?.id;

            if (!existingHolding) {
                // Create new holding — quantity/avg_price will be set by recalculateHolding below
                const { data: newHolding, error: createError } = await this.supabase
                    .from('investments_holdings')
                    .insert({
                        user_id: user.id,
                        holder_name: holdingDetails.holder_name,
                        ticker_symbol: holdingDetails.ticker_symbol,
                        name: holdingDetails.name,
                        asset_class: holdingDetails.asset_class,
                        sector: holdingDetails.sector,
                        strategy_bucket: holdingDetails.strategy_bucket,
                        avg_price: transaction.price_per_unit,
                        quantity: 0, // Will be recalculated below
                        investment_date: transaction.date,
                        current_price: transaction.price_per_unit
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                holdingId = newHolding.id;
            }

            // 2. Insert the transaction record
            const { error: txError } = await this.supabase
                .from('investment_transactions')
                .insert({
                    holding_id: holdingId,
                    user_id: user.id,
                    type: transaction.type,
                    date: transaction.date,
                    quantity: transaction.quantity,
                    price_per_unit: transaction.price_per_unit,
                    fees: transaction.fees,
                    notes: transaction.notes
                });

            if (txError) throw txError;

            // 3. Always recalculate from ALL transactions to keep quantity + avg_price accurate
            await this.recalculateHolding(holdingId!);

            return true;
        } catch (error) {
            console.error('Error adding transaction:', error);
            return false;
        }
    }
    async updateHolding(id: string, updates: Partial<InvestmentHolding>): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('investments_holdings')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating holding:', error);
            return false;
        }
    }

    async deleteHolding(id: string): Promise<boolean> {
        try {
            // Transactions usually cascade delete, but if not we might need to delete them first.
            // Assuming simplified deletion for now.
            const { error } = await this.supabase
                .from('investments_holdings')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting holding:', error);
            return false;
        }
    }

    // --- Transaction Management ---

    async updateTransaction(id: string, updates: Partial<InvestmentTransaction>): Promise<void> {
        const { error, data } = await this.supabase
            .from('investment_transactions')
            .update(updates)
            .eq('id', id)
            .select('holding_id') // Get holding ID to recalculate
            .single();

        if (error) throw error;

        if (data && data.holding_id) {
            await this.recalculateHolding(data.holding_id);
        }
    }

    async deleteTransaction(id: string): Promise<void> {
        // Get holding ID first
        const { data: tx } = await this.supabase
            .from('investment_transactions')
            .select('holding_id')
            .eq('id', id)
            .single();

        const { error } = await this.supabase
            .from('investment_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (tx && tx.holding_id) {
            await this.recalculateHolding(tx.holding_id);
        }
    }

    async recalculateHolding(holdingId: string): Promise<void> {
        // Fetch ALL transactions for this holding
        const { data: transactions, error } = await this.supabase
            .from('investment_transactions')
            .select('*')
            .eq('holding_id', holdingId);

        if (error || !transactions) return;

        let totalQty = 0;
        let totalCost = 0;

        // Simple FIFO / Weighted Avg Logic
        // For simplicity in this app, we use Weighted Average Price
        // Valid for long-term investing visualization
        transactions.forEach(tx => {
            if (tx.type === 'buy') {
                totalQty += Number(tx.quantity);
                totalCost += Number(tx.quantity) * Number(tx.price_per_unit);
            } else if (tx.type === 'sell') {
                totalQty -= Number(tx.quantity);
                // For sell, we reduce cost proportionally to keep avg price same
                if (totalQty > 0) {
                    // avg remains same, so we remove cost equal to (sell_qty * current_avg)
                    const currentAvg = totalCost / (totalQty + Number(tx.quantity));
                    totalCost -= Number(tx.quantity) * currentAvg;
                } else {
                    totalCost = 0;
                }
            }
        });

        // Update Holding
        const avgPrice = totalQty > 0 ? totalCost / totalQty : 0;

        await this.supabase
            .from('investments_holdings')
            .update({
                quantity: totalQty,
                avg_price: avgPrice,
                invested_amount: totalCost
            })
            .eq('id', holdingId);
    }
}

export const investmentService = new InvestmentService();
