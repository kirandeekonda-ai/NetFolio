import { FC, useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { LLMProviderForm } from './LLMProviderForm';
import { LLMProviderList } from './LLMProviderList';
import { useLLMProviders } from '@/hooks/useLLMProviders';
import { LLM_PROVIDER_TEMPLATES } from '@/types/llm';
import { motion, AnimatePresence } from 'framer-motion';

export const LLMProviderSettings: FC = () => {
  const {
    providers,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    testConfiguration,
    refreshProviders,
  } = useLLMProviders();

  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);

  const handleCreateNew = () => {
    setEditingProvider(null);
    setShowForm(true);
  };

  const handleEdit = (provider: any) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProvider(null);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingProvider) {
        await updateProvider(editingProvider.id, formData);
      } else {
        await createProvider(formData);
      }
      handleFormClose();
    } catch (error) {
      console.error('Error saving provider:', error);
    }
  };

  const handleDelete = async (providerId: string) => {
    if (window.confirm('Are you sure you want to delete this LLM provider?')) {
      await deleteProvider(providerId);
    }
  };

  const handleTest = async (providerId: string) => {
    const testMessage = 'Hello! This is a test message to verify your LLM configuration. Please respond with a brief confirmation.';
    return await testProvider(providerId, testMessage);
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-500">Loading LLM providers...</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <span className="text-2xl">🤖</span>
              <span>AI Provider Configuration</span>
            </h3>
            <p className="text-gray-600 mt-1">
              Configure your preferred Large Language Model services for AI-powered features
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            <span>+</span>
            Add Provider
          </Button>
        </div>

        {providers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{providers.length}</div>
              <div className="text-sm text-gray-600">Configured</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {providers.filter(p => p.is_active).length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {providers.filter(p => p.last_tested_at).length}
              </div>
              <div className="text-sm text-gray-600">Tested</div>
            </div>
          </div>
        )}
      </Card>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-red-200 bg-red-50">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-emerald-200 bg-emerald-50">
              <LLMProviderForm
                provider={editingProvider}
                templates={LLM_PROVIDER_TEMPLATES}
                onSubmit={handleFormSubmit}
                onCancel={handleFormClose}
                onTest={testConfiguration}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider List */}
      <Card>
        <LLMProviderList
          providers={providers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTest={handleTest}
          onRefresh={refreshProviders}
        />
      </Card>

      {/* Empty State */}
      {providers.length === 0 && !showForm && (
        <Card className="text-center py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto"
          >
            <div className="text-6xl mb-4">🤖</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">No AI Providers Configured</h4>
            <p className="text-gray-600 mb-6">
              Add your first AI provider to enable intelligent features like automatic transaction categorization and financial insights.
            </p>
            <Button
              variant="primary"
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              Get Started
            </Button>
          </motion.div>
        </Card>
      )}

      {/* Quick Setup Tips */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">💡</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-3">Quick Setup Tips</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">•</span>
                <div>
                  <strong>Gemini API:</strong> Get your free API key from Google AI Studio
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-purple-500 font-bold">•</span>
                <div>
                  <strong>Azure OpenAI:</strong> Requires Azure subscription and resource deployment
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-orange-500 font-bold">•</span>
                <div>
                  <strong>OpenAI API:</strong> Sign up at platform.openai.com for API access
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-indigo-500 font-bold">•</span>
                <div>
                  <strong>Custom:</strong> Use any OpenAI-compatible API endpoint
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
