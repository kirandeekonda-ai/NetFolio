
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RecurringItem, RecurringPaymentLog, PaymentDashboardItem } from '@/types/payments';

class PaymentService {
    private supabase = createClientComponentClient();

    async fetchDashboardData(userId: string, monthYear: string): Promise<PaymentDashboardItem[]> {
        // 1. Fetch all active recurring items
        const { data: items, error: itemsError } = await this.supabase
            .from('recurring_items')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('day_of_month', { ascending: true });

        if (itemsError) throw itemsError;

        // 2. Fetch logs for this month
        const { data: logs, error: logsError } = await this.supabase
            .from('recurring_payment_log')
            .select('*')
            .eq('user_id', userId)
            .eq('month_year', monthYear);

        if (logsError) throw logsError;

        // 3. Merge and compute status
        return items.map((item: RecurringItem) => {
            const log = logs?.find(l => l.item_id === item.id);
            let status: PaymentDashboardItem['status'] = 'pending';

            if (log) {
                status = log.status as any;
            } else {
                // Compute based on date
                const today = new Date();
                const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

                // Only check overdue/due_soon if looking at current month or past months
                if (monthYear <= currentMonthStr) {
                    const dueDay = item.day_of_month;
                    const todayDay = today.getDate();

                    // If viewing past month and no log -> overdue (or just pending? Let's say overdue if month is past)
                    if (monthYear < currentMonthStr) {
                        status = 'overdue';
                    } else {
                        // Current month logic
                        if (todayDay > dueDay) {
                            status = 'overdue';
                        } else if (dueDay - todayDay <= 3) {
                            status = 'due_soon';
                        }
                    }
                }
            }

            return {
                ...item,
                current_log: log,
                status
            };
        });
    }

    async upsertRecurringItem(item: Partial<RecurringItem>) {
        const { data, error } = await this.supabase
            .from('recurring_items')
            .upsert(item)
            .select()
            .single();

        if (error) throw error;
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('payments_updated'));
        return data;
    }

    async deleteRecurringItem(id: string) {
        const { error } = await this.supabase
            .from('recurring_items')
            .delete()
            .eq('id', id);
        if (error) throw error;
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('payments_updated'));
    }

    async logPayment(log: Partial<RecurringPaymentLog>) {
        const { data, error } = await this.supabase
            .from('recurring_payment_log')
            .insert(log)
            .select()
            .single();
        if (error) throw error;
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('payments_updated'));
        return data;
    }

    async undoPayment(itemId: string, monthYear: string) {
        const { error } = await this.supabase
            .from('recurring_payment_log')
            .delete()
            .eq('item_id', itemId)
            .eq('month_year', monthYear);
        if (error) throw error;
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('payments_updated'));
    }
}

export const paymentService = new PaymentService();
