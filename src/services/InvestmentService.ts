import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { InvestmentHolding, InvestmentTransaction, FinanceDashboardData } from '@/types/finance';

class InvestmentService {
    private supabase = createClientComponentClient();

    /**
     * Fetch all holdings for a user, optionally filtered by holder_name
     */
    async getHoldings(userId: string, holderFilter?: string): Promise<InvestmentHolding[]> {
        try {
            let query = this.supabase
                .from('investments_holdings')
                .select('*')
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
    private enrichHoldingData(holding: InvestmentHolding): InvestmentHolding {
        const quantity = Number(holding.quantity);
        const avgPrice = Number(holding.avg_price);
        const currentPrice = Number(holding.current_price) || avgPrice; // Fallback to avgPrice if no live data

        const investedAmount = quantity * avgPrice;
        const currentValue = quantity * currentPrice;
        const pnlAmount = currentValue - investedAmount;
        const pnlPercentage = investedAmount > 0 ? (pnlAmount / investedAmount) * 100 : 0;

        // Calculate days held
        const investmentDate = new Date(holding.investment_date);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - investmentDate.getTime());
        const daysHeld = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            ...holding,
            quantity,
            avg_price: avgPrice,
            current_price: currentPrice,
            invested_amount: investedAmount,
            current_value: currentValue,
            pnl_amount: pnlAmount,
            pnl_percentage: pnlPercentage,
            days_held: daysHeld
        };
    }

    /**
     * Calculate portfolio-level metrics
     */
    calculateMetrics(holdings: InvestmentHolding[]): FinanceDashboardData['metrics'] {
        let totalInvested = 0;
        let currentValue = 0;

        holdings.forEach(h => {
            totalInvested += h.invested_amount || 0;
            currentValue += h.current_value || 0;
        });

        const totalPnl = currentValue - totalInvested;
        const totalPnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

        return {
            total_invested: totalInvested,
            current_value: currentValue,
            total_pnl: totalPnl,
            total_pnl_percentage: totalPnlPercentage,
            day_change_amount: 0, // Pending Market Data Integration
            day_change_percentage: 0
        };
    }

    /**
     * Add a new BUY transaction (simplistic implementation)
     * In a real app, this should run inside a DB transaction to update 'holdings' + insert 'transaction'
     */
    async addTransaction(transaction: Omit<InvestmentTransaction, 'id' | 'created_at' | 'holding_id' | 'user_id'>, holdingDetails: Partial<InvestmentHolding>): Promise<boolean> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            // 1. Check if holding exists
            const { data: existingHoldings } = await this.supabase
                .from('investments_holdings')
                .select('*')
                .eq('user_id', user.id)
                .eq('ticker_symbol', holdingDetails.ticker_symbol)
                .eq('holder_name', holdingDetails.holder_name) // Separate holdings for separate holders
                .single();

            let holdingId = existingHoldings?.id;

            if (!existingHoldings) {
                // Create new holding
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
                        quantity: transaction.quantity,
                        investment_date: transaction.date,
                        current_price: transaction.price_per_unit // Initialize with buy price
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                holdingId = newHolding.id;
            } else {
                // Update existing holding (Weighted Average)
                // New Avg = ((Old Qty * Old Avg) + (New Qty * New Price)) / (Old Qty + New Qty)
                const oldQty = Number(existingHoldings.quantity);
                const oldAvg = Number(existingHoldings.avg_price);
                const newQty = Number(transaction.quantity);
                const newPrice = Number(transaction.price_per_unit);

                const totalQty = oldQty + newQty;
                const newAvg = ((oldQty * oldAvg) + (newQty * newPrice)) / totalQty;

                await this.supabase
                    .from('investments_holdings')
                    .update({
                        quantity: totalQty,
                        avg_price: newAvg,
                        // Don't update current_price, keep it live/cached
                    })
                    .eq('id', holdingId);
            }

            // 2. Log Transaction
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
}

export const investmentService = new InvestmentService();
