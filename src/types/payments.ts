
export interface RecurringItem {
    id?: string; // Optional for new items
    user_id: string;
    name: string;
    amount?: number | null;
    day_of_month: number;
    reminder_type: 'bill' | 'sip';
    category?: string;
    is_active: boolean;
    created_at?: string;
}

export interface RecurringPaymentLog {
    id: string;
    item_id: string;
    user_id: string;
    payment_date: string;
    month_year: string; // 'YYYY-MM'
    status: 'paid' | 'skipped';
    actual_amount?: number | null;
    created_at?: string;
}

export interface PaymentDashboardItem extends RecurringItem {
    current_log?: RecurringPaymentLog; // The log for the requested month, if exists
    status: 'pending' | 'paid' | 'skipped' | 'overdue' | 'due_soon';
}
