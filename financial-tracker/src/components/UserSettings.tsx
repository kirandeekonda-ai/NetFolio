import { FC, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';
import { LLMProviderSettings } from './LLMProviderSettings';

export const UserSettings: FC = () => {
  const user = useUser();
  const [currency, setCurrency] = useState<string>('USD');

  useEffect(() => {
    const fetchCurrency = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('currency')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setCurrency(data.currency);
        }
      }
    };

    fetchCurrency();
  }, [user]);

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value;
    setCurrency(newCurrency);

    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, currency: newCurrency });
    }
  };

  return (
    <div className="space-y-8">
      {/* General Settings */}
      <div>
        <h2 className="text-xl font-bold">General Settings</h2>
        <div className="mt-4">
          <label htmlFor="currency" className="block text-sm font-medium text-neutral-700">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            className="mt-1 block w-full rounded-md border-neutral-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            value={currency}
            onChange={handleCurrencyChange}
          >
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
            <option>INR</option>
          </select>
        </div>
      </div>

      {/* LLM Provider Settings */}
      <LLMProviderSettings />
    </div>
  );
};
