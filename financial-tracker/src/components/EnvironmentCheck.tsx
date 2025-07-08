import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface EnvironmentCheckProps {
  onConfigComplete: () => void;
}

interface HealthData {
  services: {
    gemini: 'available' | 'not_configured' | 'connection_failed' | 'invalid_key';
  };
  details?: string;
}

export const EnvironmentCheck: React.FC<EnvironmentCheckProps> = ({ onConfigComplete }) => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkEnvironment = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          setHealthData(data);
        } else {
          setHealthData({
            services: { gemini: 'connection_failed' },
            details: 'Health check failed'
          });
        }
      } catch (error) {
        console.error('Environment check failed:', error);
        setHealthData({
          services: { gemini: 'connection_failed' },
          details: 'Failed to connect to health check endpoint'
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkEnvironment();
  }, []);

  useEffect(() => {
    if (healthData?.services.gemini === 'available') {
      onConfigComplete();
    }
  }, [healthData, onConfigComplete]);

  if (isChecking) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
      >
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-blue-700">Testing API connection...</span>
        </div>
      </motion.div>
    );
  }

  if (healthData?.services.gemini === 'available') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
      >
        <div className="flex items-center">
          <span className="text-green-600 mr-3">✅</span>
          <div>
            <span className="text-green-700 font-semibold">AI processing is ready!</span>
            {healthData.details && (
              <div className="text-green-600 text-sm mt-1">{healthData.details}</div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Handle different error states
  const getErrorContent = () => {
    const geminiStatus = healthData?.services.gemini;
    
    switch (geminiStatus) {
      case 'invalid_key':
        return {
          title: '🔑 Invalid API Key',
          description: 'Your Gemini API key appears to be invalid.',
          instructions: [
            'Verify your API key from Google AI Studio',
            'Check that the key is correctly set in .env.local',
            'Ensure there are no extra spaces or characters',
            'Restart your development server after making changes'
          ]
        };
      
      case 'connection_failed':
        return {
          title: '🌐 Connection Failed',
          description: 'Unable to connect to the Gemini API.',
          instructions: [
            'Check your internet connection',
            'Verify the API key has necessary permissions',
            'Check if there are any firewall restrictions',
            'Try again in a few moments'
          ]
        };
      
      case 'not_configured':
      default:
        return {
          title: '⚙️ API Not Configured',
          description: 'AI processing requires a Google Gemini API key.',
          instructions: [
            'Get a free API key from Google AI Studio',
            'Create a .env.local file in your project root',
            'Add: GEMINI_API_KEY=your_api_key_here',
            'Restart your development server'
          ]
        };
    }
  };

  const errorContent = getErrorContent();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
    >
      <div className="mb-3">
        <h3 className="text-yellow-800 font-semibold flex items-center">
          <span className="mr-2">{errorContent.title.split(' ')[0]}</span>
          {errorContent.title.split(' ').slice(1).join(' ')}
        </h3>
        <p className="text-yellow-700 text-sm mt-1">{errorContent.description}</p>
        {healthData?.details && (
          <p className="text-yellow-600 text-xs mt-1 font-mono">{healthData.details}</p>
        )}
      </div>
      
      <div className="text-yellow-700 text-sm space-y-2">
        <p className="font-medium">Setup instructions:</p>
        <ol className="list-decimal list-inside ml-4 space-y-1">
          {errorContent.instructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
        
        {errorContent.title.includes('API Not Configured') && (
          <div className="mt-3 p-2 bg-yellow-100 rounded border">
            <p className="text-xs">
              <strong>Quick start:</strong> Visit{' '}
              <a 
                href="https://makersuite.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline text-yellow-800"
              >
                Google AI Studio
              </a>{' '}
              to get your free API key.
            </p>
          </div>
        )}
        
        <p className="mt-2 text-xs">
          <strong>Note:</strong> You can still use template-based processing for supported banks.
        </p>
      </div>
    </motion.div>
  );
};
