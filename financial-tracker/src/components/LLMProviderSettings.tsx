import { FC, useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { LLMProviderForm } from './LLMProviderForm';
import { LLMProviderList } from './LLMProviderList';
import { useLLMProviders } from '@/hooks/useLLMProviders';
import { LLM_PROVIDER_TEMPLATES } from '@/types/llm';

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
        <div className="flex items-center justify-center py-8">
          <div className="text-neutral-500">Loading LLM providers...</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">LLM Provider Configuration</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Configure your preferred Large Language Model services for AI-powered features.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreateNew}
          className="flex items-center gap-2"
        >
          <span>+</span>
          Add Provider
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </Card>
      )}

      {showForm && (
        <Card>
          <LLMProviderForm
            provider={editingProvider}
            templates={LLM_PROVIDER_TEMPLATES}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
            onTest={testConfiguration}
          />
        </Card>
      )}

      <Card>
        <LLMProviderList
          providers={providers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTest={handleTest}
          onRefresh={refreshProviders}
        />
      </Card>

      {providers.length === 0 && !showForm && (
        <Card className="text-center py-8">
          <div className="text-neutral-500 mb-4">
            <div className="text-4xl mb-2">🤖</div>
            <h4 className="text-lg font-medium">No LLM Providers Configured</h4>
            <p className="text-sm mt-1">
              Add your first LLM provider to enable AI-powered features like automatic transaction categorization.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleCreateNew}
            className="mt-4"
          >
            Get Started
          </Button>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <div className="text-blue-800 text-sm">
          <h4 className="font-medium mb-2">💡 Quick Setup Tips</h4>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Gemini API:</strong> Get your free API key from Google AI Studio</li>
            <li>• <strong>Azure OpenAI:</strong> Requires Azure subscription and resource deployment</li>
            <li>• <strong>OpenAI API:</strong> Sign up at platform.openai.com for API access</li>
            <li>• <strong>Custom:</strong> Use any OpenAI-compatible API endpoint</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
