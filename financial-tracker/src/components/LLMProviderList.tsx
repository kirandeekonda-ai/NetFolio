import { FC, useState } from 'react';
import { Button } from './Button';
import { LLMProvider, LLMTestResponse } from '@/types/llm';

interface LLMProviderListProps {
  providers: LLMProvider[];
  onEdit: (provider: LLMProvider) => void;
  onDelete: (providerId: string) => void;
  onTest: (providerId: string) => Promise<LLMTestResponse>;
  onRefresh: () => void;
}

export const LLMProviderList: FC<LLMProviderListProps> = ({
  providers,
  onEdit,
  onDelete,
  onTest,
  onRefresh,
}) => {
  const [testingProviders, setTestingProviders] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, LLMTestResponse>>({});

  const handleTest = async (providerId: string) => {
    setTestingProviders(prev => new Set(prev).add(providerId));
    
    try {
      const result = await onTest(providerId);
      setTestResults(prev => ({
        ...prev,
        [providerId]: result,
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [providerId]: {
          success: false,
          error: error instanceof Error ? error.message : 'Test failed',
          latency_ms: 0,
        },
      }));
    } finally {
      setTestingProviders(prev => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
    }
  };

  const getProviderIcon = (providerType: string): string => {
    switch (providerType) {
      case 'gemini':
        return '🔮';
      case 'azure_openai':
        return '☁️';
      case 'openai':
        return '🤖';
      case 'custom':
        return '⚙️';
      default:
        return '🔧';
    }
  };

  const getProviderDisplayName = (providerType: string): string => {
    switch (providerType) {
      case 'gemini':
        return 'Google Gemini';
      case 'azure_openai':
        return 'Azure OpenAI';
      case 'openai':
        return 'OpenAI';
      case 'custom':
        return 'Custom';
      default:
        return providerType;
    }
  };

  const getStatusBadge = (provider: LLMProvider) => {
    if (!provider.is_active) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Inactive
        </span>
      );
    }

    if (provider.test_status === 'success') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          ✅ Working
        </span>
      );
    }

    if (provider.test_status === 'failed') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          ❌ Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        ⏳ Untested
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <div className="text-4xl mb-2">📝</div>
        <p>No LLM providers configured yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Configured Providers ({providers.length})</h4>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
        >
          🔄 Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {providers.map((provider) => {
          const isCurrentlyTesting = testingProviders.has(provider.id);
          const currentTestResult = testResults[provider.id];

          return (
            <div
              key={provider.id}
              className={`p-4 border rounded-lg ${
                provider.is_default 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getProviderIcon(provider.provider_type)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{provider.name}</h5>
                        {provider.is_default && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {getProviderDisplayName(provider.provider_type)}
                        {provider.model_name && ` • ${provider.model_name}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <div className="flex items-center gap-2">
                      <span>Status:</span>
                      {getStatusBadge(provider)}
                    </div>
                    {provider.last_tested_at && (
                      <div>
                        Last tested: {formatDate(provider.last_tested_at)}
                      </div>
                    )}
                  </div>

                  {provider.test_error && provider.test_status === 'failed' && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>Last error:</strong> {provider.test_error}
                    </div>
                  )}

                  {currentTestResult && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      currentTestResult.success 
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {currentTestResult.success ? (
                        <div>
                          <strong>✅ Test successful!</strong> ({currentTestResult.latency_ms}ms)
                          {currentTestResult.response && (
                            <div className="mt-1 text-xs opacity-80">
                              Response: {currentTestResult.response.substring(0, 100)}...
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <strong>❌ Test failed:</strong> {currentTestResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTest(provider.id)}
                    disabled={isCurrentlyTesting}
                  >
                    {isCurrentlyTesting ? '⏳' : '🧪'} Test
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(provider)}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onDelete(provider.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-neutral-500">
        <p>💡 <strong>Tip:</strong> The default provider will be used for AI-powered features like transaction categorization.</p>
      </div>
    </div>
  );
};
