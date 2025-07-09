import { NextPage } from 'next';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Table } from '@/components/Table';
import { Input } from '@/components/Input';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { updateTransaction } from '@/store/transactionsSlice';
import { setCategories } from '@/store/categoriesSlice';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';
import { getCategoryColorStyle } from '@/utils/categoryColors';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/utils/supabase';

const Categorize: NextPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useUser();
  const transactions = useSelector((state: RootState) => state.transactions.items);
  const categories = useSelector((state: RootState) => state.categories.items);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('INR');
  const [showNoTransactionsMessage, setShowNoTransactionsMessage] = useState(false);

  useEffect(() => {
    // Check if user came from upload with no transactions
    if (router.query.message === 'no_transactions') {
      setShowNoTransactionsMessage(true);
      // Clear the query parameter after showing the message
      const { message, ...cleanQuery } = router.query;
      router.replace({
        pathname: router.pathname,
        query: cleanQuery
      }, undefined, { shallow: true });
    }
  }, [router.query]);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('currency, categories')
          .eq('user_id', user.id)
          .single();

        if (data) {
          if (data.currency) {
            setCurrency(data.currency);
          }
          if (data.categories) {
            dispatch(setCategories(data.categories));
          }
        }
      }
    };

    fetchUserPreferences();
  }, [user]);

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
    setOpenDropdown(null); // Close dropdown after selection
  };

  const columns = [
    { 
      key: 'date' as keyof Transaction,
      header: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
      className: 'w-1/12',
    },
    { 
      key: 'description' as keyof Transaction,
      header: 'Description',
      className: 'w-6/12',
    },
    {
      key: 'amount' as keyof Transaction,
      header: 'Amount',
      render: (value: number) => (
        <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
          {formatAmount(value, currency)}
        </span>
      ),
      className: 'w-2/12 text-right',
    },
    {
      key: 'type' as keyof Transaction,
      header: 'Type',
      render: (value: 'income' | 'expense') => {
        const style = getCategoryColorStyle(value === 'income' ? 'Income' : 'Expense', categories);
        return (
          <span 
            className={`px-2 py-1 rounded-label text-sm ${style.bg} ${style.text}`}
            style={style.style}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      },
      className: 'w-1/12',
    },
    {
      key: 'category' as keyof Transaction,
      header: 'Category',
      render: (value: string, item: Transaction) => {
        const categoryName = value || 'Uncategorized';
        const style = getCategoryColorStyle(categoryName, categories);
        return (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(openDropdown === item.id ? null : item.id);
              }}
              className={`px-3 py-1 rounded-label text-sm ${style.bg} ${style.text}`}
              style={style.style}
            >
              {categoryName === 'Uncategorized' ? 'Select Category' : categoryName}
            </button>
            {openDropdown === item.id && (
              <div
                className="absolute z-10 mt-2 w-48 bg-white rounded-card shadow-card"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside dropdown
              >
                <div className="p-2 grid grid-cols-1 gap-1">
                  {categories.map((category) => {
                    const categoryStyle = getCategoryColorStyle(category.name, categories);
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(item, category)}
                        className={`px-3 py-1.5 text-left text-sm rounded-button hover:bg-gray-100 transition-colors ${category.name === value ? `${categoryStyle.bg} ${categoryStyle.text}` : ''}`}
                        style={category.name === value ? categoryStyle.style : undefined}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      },
      className: 'w-2/12',
    },
  ];

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setOpenDropdown(null)} // Close dropdown when clicking outside
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-heading font-bold">Categorize Transactions</h1>
          <Input
            type="search"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {showNoTransactionsMessage && (
          <Card className="mb-6">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Statement Uploaded Successfully
              </h2>
              <p className="text-gray-600 mb-4">
                Your statement was uploaded but no transactions were extracted. This could happen if:
              </p>
              <ul className="text-left text-sm text-gray-600 max-w-md mx-auto space-y-1">
                <li>• The file format is not supported by the template</li>
                <li>• The statement is empty or has no transaction data</li>
                <li>• The template needs to be updated for your bank's format</li>
              </ul>
              <div className="mt-4">
                <button
                  onClick={() => setShowNoTransactionsMessage(false)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Card>
        )}

        {filteredTransactions.length === 0 && !showNoTransactionsMessage ? (
          <Card>
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Transactions to Categorize
              </h2>
              <p className="text-gray-600 mb-6">
                Upload a bank statement to start categorizing transactions.
              </p>
              <button
                onClick={() => router.push('/statements')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Upload Statement
              </button>
            </div>
          </Card>
        ) : (
          <>
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
          </>
        )}
      </motion.div>
    </Layout>
  );
};

export default Categorize;
