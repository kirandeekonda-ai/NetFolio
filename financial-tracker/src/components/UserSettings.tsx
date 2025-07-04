import { FC } from 'react';

export const UserSettings: FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold">User Settings</h2>
      <div className="mt-4">
        <label htmlFor="currency" className="block text-sm font-medium text-neutral-700">
          Currency
        </label>
        <select
          id="currency"
          name="currency"
          className="mt-1 block w-full rounded-md border-neutral-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          defaultValue="USD"
        >
          <option>USD</option>
          <option>EUR</option>
          <option>GBP</option>
        </select>
      </div>
    </div>
  );
};
