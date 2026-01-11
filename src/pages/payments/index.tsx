import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle2, Circle, AlertCircle, Clock, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { paymentService } from '@/services/PaymentService';
import { PaymentDashboardItem, RecurringItem } from '@/types/payments';
import { UpsertPaymentModal } from '@/components/payments/UpsertPaymentModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PaymentsPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<PaymentDashboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Modals
    const [isUpsertOpen, setIsUpsertOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
    const [confirmPaymentItem, setConfirmPaymentItem] = useState<PaymentDashboardItem | null>(null);
    const [confirmAmount, setConfirmAmount] = useState('');

    useEffect(() => {
        if (user) fetchData();
    }, [user, currentDate]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const data = await paymentService.fetchDashboardData(user.id, monthYear);
            setItems(data);
        } catch (error) {
            console.error('Failed to fetch payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const handleMarkPaid = async (item: PaymentDashboardItem) => {
        if (item.status === 'paid' && item.current_log) {
            const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            await paymentService.undoPayment(item.id!, monthYear);
            fetchData();
            return;
        }

        if (item.reminder_type === 'sip' || !item.amount) {
            setConfirmAmount(item.amount?.toString() || '');
            setConfirmPaymentItem(item);
        } else {
            confirmPayment(item, item.amount);
        }
    };

    const confirmPayment = async (item: PaymentDashboardItem, actualAmount: number) => {
        if (!user) return;
        const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        await paymentService.logPayment({
            item_id: item.id!,
            user_id: user.id,
            payment_date: new Date().toISOString().split('T')[0],
            month_year: monthYear,
            status: 'paid',
            actual_amount: actualAmount
        });

        setConfirmPaymentItem(null);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this recurring item? History will remain.')) {
            await paymentService.deleteRecurringItem(id);
            fetchData();
        }
    };

    const totalDue = items.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalPaid = items.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.current_log?.actual_amount || i.amount || 0), 0);
    const pendingCount = items.filter(i => i.status !== 'paid' && i.status !== 'skipped').length;
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <Layout>
            <Head><title>Monthly Payments | Portfoliio</title></Head>

            {/* Main Content Container - Matches Portfolio Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8 pb-24 space-y-8">

                {/* Header Section - Matches Portfolio Header Style */}
                <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl md:rounded-3xl shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                    <div className="relative p-6 md:px-8 md:py-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-center md:text-left">
                            <h1 className="text-2xl md:text-4xl font-light text-white mb-2">Monthly Payments</h1>
                            <p className="text-base md:text-xl text-blue-100 font-light">
                                Your command center for bills & investments
                            </p>
                        </div>

                        {/* Month Selector - Glassmorphism */}
                        <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full md:w-auto">
                            <div className="flex items-center justify-between w-full sm:w-auto gap-3 bg-white/10 backdrop-blur-sm p-1.5 rounded-xl border border-white/20 shadow-lg">
                                <Button variant="ghost" size="icon" onClick={() => handleMonthChange(-1)} className="rounded-lg hover:bg-white/20 text-white h-8 w-8 md:h-10 md:w-10">
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <span className="font-medium text-base md:text-lg min-w-[120px] md:min-w-[160px] text-center text-white tracking-wide">{monthName}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleMonthChange(1)} className="rounded-lg hover:bg-white/20 text-white h-8 w-8 md:h-10 md:w-10">
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>

                            <Button
                                onClick={() => { setEditingItem(null); setIsUpsertOpen(true); }}
                                className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold px-6 py-3 md:py-6 h-auto text-sm md:text-base"
                            >
                                <Plus className="mr-2 h-5 w-5" /> Add Payment
                            </Button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards - Colorful Gradients */}
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 shadow-xl text-white">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                        <div className="relative">
                            <p className="text-white/90 text-xs md:text-sm font-medium uppercase tracking-wide mb-3">Total Commitments</p>
                            <p className="text-3xl md:text-4xl font-bold mb-1">₹{totalDue.toLocaleString()}</p>
                            <p className="text-blue-100 text-sm">Estimated Monthly Fixed</p>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 shadow-xl text-white">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                        <div className="relative">
                            <p className="text-white/90 text-xs md:text-sm font-medium uppercase tracking-wide mb-3">Paid So Far</p>
                            <p className="text-3xl md:text-4xl font-bold mb-1">₹{totalPaid.toLocaleString()}</p>
                            <p className="text-emerald-100 text-sm">
                                {totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}% completed
                            </p>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 shadow-xl text-white">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                        <div className="relative">
                            <p className="text-white/90 text-xs md:text-sm font-medium uppercase tracking-wide mb-3">Pending Items</p>
                            <p className="text-3xl md:text-4xl font-bold mb-1">{pendingCount}</p>
                            <p className="text-amber-100 text-sm">Action required</p>
                        </div>
                    </div>
                </div>

                {/* The List - Clean White Card */}
                <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden overflow-x-auto">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                        <CardTitle className="text-lg text-slate-700 font-semibold flex items-center gap-2">
                            Activity Log
                            <Badge variant="secondary" className="bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 text-xs font-normal">
                                {items.length} Items
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Clock className="h-8 w-8 animate-pulse opacity-50" />
                                <p>Loading your payments...</p>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">
                                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Plus className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-1">No payments set up</h3>
                                <p className="mb-6 text-slate-500">Get started by adding your first bill or SIP.</p>
                                <Button onClick={() => setIsUpsertOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    Create your first bill
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {items.map((item, idx) => {
                                    const isPaid = item.status === 'paid';
                                    const isOverdue = item.status === 'overdue';

                                    return (
                                        <div key={item.id}
                                            className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 transition-all duration-200 hover:bg-slate-50 gap-4 sm:gap-0
                                                ${isPaid ? 'bg-slate-50/30' : ''}
                                            `}
                                        >
                                            <div className="flex items-start gap-3 sm:gap-5 w-full sm:w-auto">
                                                {/* Interactive Checkbox/Status */}
                                                <button
                                                    onClick={() => handleMarkPaid(item)}
                                                    className={`
                                                        mt-1 sm:mt-0 rounded-full p-1.5 sm:p-2 transition-all duration-300 focus:outline-none shadow-sm flex-shrink-0
                                                        ${isPaid ? 'bg-emerald-100 text-emerald-600' :
                                                            isOverdue ? 'bg-red-100 text-red-600 animate-pulse' :
                                                                'bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-300'}
                                                    `}
                                                >
                                                    {isPaid ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" /> :
                                                        isOverdue ? <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" /> : <Circle className="h-5 w-5 sm:h-6 sm:w-6" />}
                                                </button>

                                                <div className="flex flex-col gap-1 w-full">
                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                        <span className={`text-base sm:text-lg font-semibold transition-colors ${isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                            {item.name}
                                                        </span>
                                                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5">
                                                            {item.category}
                                                        </Badge>
                                                        {item.reminder_type === 'sip' && (
                                                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 border text-[10px] uppercase tracking-wider shadow-none hover:bg-blue-100">SIP</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500 font-medium">
                                                        <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {isOverdue ? 'Overdue - was due ' : 'Due '}
                                                            <span className="text-slate-700">{item.day_of_month}{getOrdinal(item.day_of_month)}</span>
                                                        </span>

                                                        {item.amount && (
                                                            <span className="flex items-center gap-1.5 before:hidden sm:before:block sm:before:content-['•'] before:text-slate-300">
                                                                Est: <span className="text-slate-700">₹{item.amount.toLocaleString()}</span>
                                                            </span>
                                                        )}

                                                        {isPaid && item.current_log?.actual_amount && (
                                                            <span className="flex items-center gap-1.5 text-emerald-600 before:hidden sm:before:block sm:before:content-['•'] before:text-slate-300">
                                                                Paid: <span className="font-bold">₹{item.current_log.actual_amount.toLocaleString()}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions - Always visible on mobile, hover on desktop */}
                                            <div className="flex items-center justify-end w-full sm:w-auto gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0 border-slate-100">
                                                <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsUpsertOpen(true); }}
                                                    className="hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg h-8 px-3 text-xs sm:text-sm">
                                                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id!)}
                                                    className="hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg h-8 px-3 text-xs sm:text-sm">
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Upsert Modal */}
            <UpsertPaymentModal
                isOpen={isUpsertOpen}
                onClose={() => setIsUpsertOpen(false)}
                onSuccess={fetchData}
                itemToEdit={editingItem}
            />

            {/* Confirm Payment Modal - Clean Light Theme */}
            <Dialog open={!!confirmPaymentItem} onOpenChange={(o) => !o && setConfirmPaymentItem(null)}>
                <DialogContent className="bg-white sm:max-w-md shadow-2xl border-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">Confirm Value</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Enter the final amount for <span className="text-slate-900 font-semibold">{confirmPaymentItem?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Amount Paid</Label>
                        <div className="relative mt-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-serif">₹</span>
                            <Input
                                type="number"
                                value={confirmAmount}
                                onChange={e => setConfirmAmount(e.target.value)}
                                autoFocus
                                className="pl-7 text-lg font-medium border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 bg-slate-50 text-slate-900"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmPaymentItem(null)} className="text-slate-600 border-slate-200 hover:bg-slate-50">Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200" onClick={() => {
                            if (confirmPaymentItem && confirmAmount) {
                                confirmPayment(confirmPaymentItem, parseFloat(confirmAmount));
                            }
                        }}>Confirm Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </Layout>
    );
}

function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
