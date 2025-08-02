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
      <div className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-lg border border-white/30 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-600 text-lg font-medium">Loading AI providers...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <span>AI Provider Configuration</span>
          </h3>
          <p className="text-gray-600 text-lg">
            Configure your preferred Large Language Model services for AI-powered features
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-6 py-3 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
        >
          <span className="text-lg">+</span>
          Add Provider
        </Button>
      </div>

      {providers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 backdrop-blur-sm rounded-2xl p-6 border border-emerald-200/50 text-center"
          >
            <div className="text-3xl font-bold text-emerald-600 mb-2">{providers.length}</div>
            <div className="text-gray-600 font-medium">Configured</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-200/50 text-center"
          >
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {providers.filter(p => p.is_active).length}
            </div>
            <div className="text-gray-600 font-medium">Active</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/50 text-center"
          >
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {providers.filter(p => p.last_tested_at).length}
            </div>
            <div className="text-gray-600 font-medium">Tested</div>
          </motion.div>
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-200/50 p-6"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-rose-100 rounded-2xl flex items-center justify-center border border-red-200/50">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-red-700 text-lg">
              <strong>Error:</strong> {error}
            </div>
          </div>
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
            className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 backdrop-blur-sm rounded-3xl shadow-lg border border-emerald-200/50 p-8"
          >
            <LLMProviderForm
              provider={editingProvider}
              templates={LLM_PROVIDER_TEMPLATES}
              onSubmit={handleFormSubmit}
              onCancel={handleFormClose}
              onTest={testConfiguration}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider List */}
      <div className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-lg border border-white/30 p-8">
        <LLMProviderList
          providers={providers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTest={handleTest}
          onRefresh={refreshProviders}
        />
      </div>

      {/* Empty State */}
      {providers.length === 0 && !showForm && (
        <div className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-lg border border-white/30 p-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-200/50">
              <span className="text-5xl">🤖</span>
            </div>
            <h4 className="text-2xl font-bold text-gray-900 mb-4">No AI Providers Configured</h4>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Add your first AI provider to enable intelligent features like automatic transaction categorization and financial insights.
            </p>
            <Button
              variant="primary"
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-8 py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200 text-lg font-semibold"
            >
              Get Started
            </Button>
          </motion.div>
        </div>
      )}

      {/* Quick Setup Tips */}
      <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-3xl shadow-lg border border-blue-200/50 p-8">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center border border-blue-200/50">
              <span className="text-3xl">💡</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-blue-900 mb-6">Quick Setup Tips</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-800">
              <div className="flex items-start space-x-3">
                <span className="text-emerald-500 font-bold text-xl">•</span>
                <div>
                  <strong className="text-lg">Gemini API:</strong>
                  <p className="text-blue-700 mt-1">Get your free API key from Google AI Studio</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-purple-500 font-bold text-xl">•</span>
                <div>
                  <strong className="text-lg">Azure OpenAI:</strong>
                  <p className="text-blue-700 mt-1">Requires Azure subscription and resource deployment</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-orange-500 font-bold text-xl">•</span>
                <div>
                  <strong className="text-lg">OpenAI API:</strong>
                  <p className="text-blue-700 mt-1">Sign up at platform.openai.com for API access</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-indigo-500 font-bold text-xl">•</span>
                <div>
                  <strong className="text-lg">Custom:</strong>
                  <p className="text-blue-700 mt-1">Use any OpenAI-compatible API endpoint</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
