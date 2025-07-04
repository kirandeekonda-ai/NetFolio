import { NextPage } from 'next';
import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Table } from '@/components/Table';
import { Input } from '@/components/Input';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { updateTransaction } from '@/store/transactionsSlice';
import { Transaction, Category } from '@/types';

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const Categorize: NextPage = () => {
  const dispatch = useDispatch();
  const transactions = useSelector((state: RootState) => state.transactions.items);
  const categories = useSelector((state: RootState) => state.categories.items);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const handleCategoryChange = (transaction: Transaction, category: Category) => {
    dispatch(updateTransaction({
      ...transaction,
      category: category.name,
    }));
  };

  const columns = [
    { 
      key: 'date' as keyof Transaction,
      header: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    { 
      key: 'description' as keyof Transaction,
      header: 'Description',
    },
    {
      key: 'amount' as keyof Transaction,
      header: 'Amount',
      render: (value: number) => (
        <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
          {formatAmount(value)}
        </span>
      ),
    },
    {
      key: 'type' as keyof Transaction,
      header: 'Type',
      render: (value: 'income' | 'expense') => (
        <span className={`
          px-2 py-1 rounded-label text-sm
          ${value === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
        `}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'category' as keyof Transaction,
      header: 'Category',
      render: (value: string, item: Transaction) => (
        <div className="relative group">
          <button
            className={`
              px-3 py-1 rounded-label text-sm
              ${value ? 'bg-primary-light text-primary-dark' : 'bg-neutral-100 text-neutral-500'}
            `}
          >
            {value || 'Select Category'}
          </button>
          <div className="
            absolute z-10 mt-2 w-48 bg-white rounded-card shadow-card
            opacity-0 invisible group-hover:opacity-100 group-hover:visible
            transition-all duration-200
          ">
            <div className="p-2 grid grid-cols-1 gap-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(item, category)}
                  className={`
                    px-3 py-1.5 text-left text-sm rounded-button
                    hover:bg-neutral-50 transition-colors
                    ${category.name === value ? 'bg-primary-light text-primary-dark' : ''}
                  `}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-heading font-bold">
            Categorize Transactions
          </h1>
          <Input
            type="search"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Card>
          <Table
            data={filteredTransactions}
            columns={columns}
          />
        </Card>

        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-neutral-500">
            {filteredTransactions.length} transactions •{' '}
            {filteredTransactions.filter(t => t.category).length} categorized
          </p>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Categorize;
