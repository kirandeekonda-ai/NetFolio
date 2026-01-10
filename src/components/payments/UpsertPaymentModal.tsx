import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { paymentService } from '@/services/PaymentService';
import { useAuth } from '@/components/providers/AuthProvider';
import { RecurringItem } from '@/types/payments';

interface UpsertPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemToEdit: RecurringItem | null;
}

export function UpsertPaymentModal({ isOpen, onClose, onSuccess, itemToEdit }: UpsertPaymentModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [reminderType, setReminderType] = useState('bill');
    const [category, setCategory] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (itemToEdit) {
                setName(itemToEdit.name);
                setAmount(itemToEdit.amount?.toString() || '');
                setDayOfMonth(itemToEdit.day_of_month.toString());
                setReminderType(itemToEdit.reminder_type);
                setCategory(itemToEdit.category);
            } else {
                // Reset defaults
                setName('');
                setAmount('');
                setDayOfMonth('1');
                setReminderType('bill');
                setCategory('Utilities');
            }
        }
    }, [isOpen, itemToEdit]);

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await paymentService.upsertRecurringItem({
                id: itemToEdit?.id,
                user_id: user.id,
                name,
                amount: amount ? parseFloat(amount) : undefined,
                day_of_month: parseInt(dayOfMonth),
                reminder_type: reminderType as 'bill' | 'sip',
                category: category || 'General',
                is_active: true
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save item');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-white sm:max-w-md shadow-2xl border-0 text-slate-900">
                <DialogHeader className="pb-4 border-b border-slate-100">
                    <DialogTitle className="text-xl font-bold text-indigo-900">{itemToEdit ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Configure your recurring {reminderType === 'sip' ? 'investment' : 'bill'}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Name</Label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Netflix, Rent, SIP"
                            className="bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (Est.)</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Optional"
                                className="bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Due Day</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={dayOfMonth}
                                onChange={e => setDayOfMonth(e.target.value)}
                            >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                    <option key={d} value={d} className="bg-white text-slate-900">
                                        {d}{[1, 21, 31].includes(d) ? 'st' : [2, 22].includes(d) ? 'nd' : [3, 23].includes(d) ? 'rd' : 'th'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Type</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={reminderType}
                                onChange={e => setReminderType(e.target.value)}
                            >
                                <option value="bill" className="bg-white text-slate-900">Bill Payment</option>
                                <option value="sip" className="bg-white text-slate-900">SIP / Investment</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</Label>
                            <Input
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                placeholder="Utilities"
                                className="bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-slate-100 pt-4">
                    <Button variant="ghost" onClick={onClose} className="hover:bg-slate-100 text-slate-600">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !name} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all duration-200">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Item
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
