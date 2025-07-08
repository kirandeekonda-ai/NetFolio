import { FC, useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { LLMProviderCreate, LLMProviderTemplate, LLMProviderType, LLMTestResponse } from '@/types/llm';

interface LLMProviderFormProps {
  provider?: any;
  templates: LLMProviderTemplate[];
  onSubmit: (data: LLMProviderCreate) => void;
  onCancel: () => void;
  onTest: (config: any, message: string) => Promise<LLMTestResponse>;
}

export const LLMProviderForm: FC<LLMProviderFormProps> = ({
  provider,
  templates,
  onSubmit,
  onCancel,
  onTest,
}) => {
  const [formData, setFormData] = useState<LLMProviderCreate>({
    name: '',
    provider_type: 'gemini',
    api_key: '',
    model_name: '',
    api_endpoint: '',
    azure_resource_name: '',
    azure_deployment_name: '',
    azure_api_version: '',
    is_active: true,
    is_default: false,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<LLMProviderTemplate | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<LLMTestResponse | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name || '',
        provider_type: provider.provider_type || 'gemini',
        api_key: provider.api_key || '',
        model_name: provider.model_name || '',
        api_endpoint: provider.api_endpoint || '',
        azure_resource_name: provider.azure_resource_name || '',
        azure_deployment_name: provider.azure_deployment_name || '',
        azure_api_version: provider.azure_api_version || '',
        is_active: provider.is_active ?? true,
        is_default: provider.is_default ?? false,
      });
      const template = templates.find(t => t.provider_type === provider.provider_type);
      setSelectedTemplate(template || null);
    } else {
      // Default to first template
      const defaultTemplate = templates[0];
      setSelectedTemplate(defaultTemplate);
      setFormData(prev => ({
        ...prev,
        provider_type: defaultTemplate.provider_type,
        ...defaultTemplate.default_config,
      }));
    }
  }, [provider, templates]);

  const handleProviderTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerType = e.target.value as LLMProviderType;
    const template = templates.find(t => t.provider_type === providerType);
    
    setSelectedTemplate(template || null);
    setFormData(prev => ({
      ...prev,
      provider_type: providerType,
      ...(template?.default_config || {}),
    }));
    setTestResult(null);
    setErrors({});
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Provider name is required';
    }

    if (selectedTemplate) {
      selectedTemplate.required_fields.forEach(field => {
        const value = (formData as any)[field];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field] = `${field.replace('_', ' ')} is required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validateForm()) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const testMessage = 'Hello! This is a test message to verify your LLM configuration. Please respond with a brief confirmation.';
      const result = await onTest(formData, testMessage);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        latency_ms: 0,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderFieldsForProvider = () => {
    if (!selectedTemplate) return null;

    const fields = [];

    // Common fields
    fields.push(
      <Input
        key="name"
        label="Provider Name"
        value={formData.name}
        onChange={(e) => handleInputChange('name', e.target.value)}
        placeholder="e.g., My Gemini API"
        error={errors.name}
        required
      />
    );

    // API Key (for most providers)
    if (selectedTemplate.required_fields.includes('api_key') || selectedTemplate.optional_fields.includes('api_key')) {
      fields.push(
        <div key="api_key" className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            API Key {selectedTemplate.required_fields.includes('api_key') && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={formData.api_key || ''}
              onChange={(e) => handleInputChange('api_key', e.target.value)}
              className="w-full rounded border border-neutral-200 px-3 py-2 pr-10 focus:border-primary focus:outline-none"
              placeholder="Enter your API key"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-2 text-neutral-500 hover:text-neutral-700"
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.api_key && <p className="text-sm text-red-500">{errors.api_key}</p>}
        </div>
      );
    }

    // Model name
    if (selectedTemplate.required_fields.includes('model_name') || selectedTemplate.optional_fields.includes('model_name')) {
      fields.push(
        <Input
          key="model_name"
          label="Model Name"
          value={formData.model_name || ''}
          onChange={(e) => handleInputChange('model_name', e.target.value)}
          placeholder={getModelPlaceholder(formData.provider_type)}
          error={errors.model_name}
          required={selectedTemplate.required_fields.includes('model_name')}
        />
      );
    }

    // API Endpoint (for custom providers)
    if (selectedTemplate.required_fields.includes('api_endpoint') || selectedTemplate.optional_fields.includes('api_endpoint')) {
      fields.push(
        <Input
          key="api_endpoint"
          label="API Endpoint"
          value={formData.api_endpoint || ''}
          onChange={(e) => handleInputChange('api_endpoint', e.target.value)}
          placeholder="https://your-api-endpoint.com/v1"
          error={errors.api_endpoint}
          required={selectedTemplate.required_fields.includes('api_endpoint')}
        />
      );
    }

    // Azure-specific fields
    if (formData.provider_type === 'azure_openai') {
      fields.push(
        <Input
          key="azure_resource_name"
          label="Azure Resource Name"
          value={formData.azure_resource_name || ''}
          onChange={(e) => handleInputChange('azure_resource_name', e.target.value)}
          placeholder="your-resource-name"
          error={errors.azure_resource_name}
          required
        />,
        <Input
          key="azure_deployment_name"
          label="Azure Deployment Name"
          value={formData.azure_deployment_name || ''}
          onChange={(e) => handleInputChange('azure_deployment_name', e.target.value)}
          placeholder="your-deployment-name"
          error={errors.azure_deployment_name}
          required
        />,
        <Input
          key="azure_api_version"
          label="Azure API Version"
          value={formData.azure_api_version || ''}
          onChange={(e) => handleInputChange('azure_api_version', e.target.value)}
          placeholder="2024-08-01-preview"
          error={errors.azure_api_version}
          required
        />
      );
    }

    return fields;
  };

  const getModelPlaceholder = (providerType: LLMProviderType): string => {
    switch (providerType) {
      case 'gemini':
        return 'gemini-2.0-flash';
      case 'azure_openai':
      case 'openai':
        return 'gpt-4o-mini';
      case 'custom':
        return 'your-model-name';
      default:
        return 'model-name';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {provider ? 'Edit LLM Provider' : 'Add New LLM Provider'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Type Selection */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            Provider Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.provider_type}
            onChange={handleProviderTypeChange}
            className="w-full rounded border border-neutral-200 px-3 py-2 focus:border-primary focus:outline-none"
            disabled={!!provider} // Don't allow changing type for existing providers
          >
            {templates.map((template) => (
              <option key={template.provider_type} value={template.provider_type}>
                {template.name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="text-xs text-neutral-600">{selectedTemplate.description}</p>
          )}
        </div>

        {/* Dynamic fields based on provider type */}
        {renderFieldsForProvider()}

        {/* Settings */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="rounded border-neutral-300"
            />
            <span className="text-sm">Active</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => handleInputChange('is_default', e.target.checked)}
              className="rounded border-neutral-300"
            />
            <span className="text-sm">Set as default provider</span>
          </label>
        </div>

        {/* Test Section */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Test Configuration</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Now'}
            </Button>
          </div>

          {testResult && (
            <div className={`p-3 rounded text-sm ${
              testResult.success 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {testResult.success ? (
                <div>
                  <div className="font-medium mb-1">✅ Test Successful</div>
                  <div className="text-xs opacity-90">
                    Response time: {testResult.latency_ms}ms
                  </div>
                  {testResult.response && (
                    <div className="mt-2 p-2 bg-white rounded text-neutral-700 text-xs">
                      {testResult.response}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="font-medium mb-1">❌ Test Failed</div>
                  <div className="text-xs">{testResult.error}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={testing}
          >
            {provider ? 'Update Provider' : 'Add Provider'}
          </Button>
        </div>
      </form>
    </div>
  );
};
