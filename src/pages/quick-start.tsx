import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Layout } from '@/components/layout/Layout';
import { BankAccountForm } from '@/components/BankAccountForm';
import { SimplifiedStatementUpload } from '@/components/SimplifiedStatementUpload';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Auth } from '@/components/Auth';
import { motion } from 'framer-motion';
import { BankAccountCreate } from '@/types';

const QuickStartPage: NextPage = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<any>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/landing');
    }
  }, [session, router]);

  const handleAccountCreate = async (formData: BankAccountCreate) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newAccount = await response.json();
        setCreatedAccount(newAccount);
        setCurrentStep(2);
      } else {
        const error = await response.json();
        console.error('Error creating account:', error);
        alert('Failed to create account: ' + error.error);
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Error creating account: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatementUpload = () => {
    // After statement upload, go to categorize page
    router.push('/categorize');
  };

  const handleSkipToLanding = async () => {
    // Mark user as having completed quick-start setup
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: session?.user?.id,
          quick_start_completed: true,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
    
    router.push('/landing');
  };

  const handleComplete = () => {
    router.push('/landing');
  };

  if (!session?.user) {
    return <Auth />;
  }

  const steps = [
    { number: 1, title: 'Add Your First Account', description: 'Set up your primary bank account' },
    { number: 2, title: 'Upload Statement (Optional)', description: 'Import your transaction history' },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Progress Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl font-bold text-gray-900">Quick Setup</h1>
          <p className="text-gray-600">Let's get your account ready in just a few steps</p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.number
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.number ? '✓' : step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-24 h-1 mx-2 ${
                        currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}
            </div>
          </div>
        </motion.div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 1 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">🏦</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Bank Account</h2>
                <p className="text-gray-600">
                  Start by adding your primary bank account to track your finances effectively.
                </p>
              </div>

              <BankAccountForm
                onSubmit={handleAccountCreate}
                onCancel={() => setShowSkipConfirm(true)}
                isLoading={isLoading}
              />
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">📄</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Bank Statement (Optional)</h2>
                <p className="text-gray-600 mb-4">
                  Import your recent transactions to get started with categorization and insights.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p><strong>Account:</strong> {createdAccount?.bank_name} - {createdAccount?.account_type}</p>
                  <p><strong>Currency:</strong> {createdAccount?.currency}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Ready to upload your first statement? This will help us categorize your transactions automatically.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => router.push('/statements')}
                      className="bg-blue-600 hover:bg-blue-700 px-6"
                    >
                      Upload Statement
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleComplete}
                      className="px-6"
                    >
                      Skip for Now
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </motion.div>

        {/* Skip Confirmation Modal */}
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-lg p-6 max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Skip Quick Setup?</h3>
              <p className="text-gray-600 mb-6">
                You can always add accounts and upload statements later from your dashboard.
              </p>
              <div className="flex justify-end space-x-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowSkipConfirm(false)}
                >
                  Continue Setup
                </Button>
                <Button
                  onClick={handleSkipToLanding}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Skip to Dashboard
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Success Celebration */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900">All Set!</h2>
            <p className="text-xl text-gray-600">
              Your NetFolio account is ready to help you manage your finances.
            </p>
            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700 px-8 py-3"
            >
              Go to Dashboard
            </Button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default QuickStartPage;
