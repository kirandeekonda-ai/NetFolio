import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SecurityStatus } from './SecurityStatus';
import { Button } from './Button';
import { Card } from './Card';

export const SecurityStatusDemo: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  const demoScenarios = [
    {
      title: "High Security Alert",
      description: "Multiple types of sensitive data detected",
      breakdown: {
        accountNumbers: 7,
        mobileNumbers: 2,
        emails: 2,
        panIds: 1,
        customerIds: 3,
        ifscCodes: 1,
        cardNumbers: 1,
        addresses: 1,
        names: 2
      }
    },
    {
      title: "Moderate Security Alert", 
      description: "Some sensitive data found",
      breakdown: {
        accountNumbers: 3,
        mobileNumbers: 0,
        emails: 1,
        panIds: 1,
        customerIds: 0,
        ifscCodes: 1,
        cardNumbers: 0,
        addresses: 0,
        names: 0
      }
    },
    {
      title: "Low Security Alert",
      description: "Minimal sensitive data detected",
      breakdown: {
        accountNumbers: 1,
        mobileNumbers: 0,
        emails: 0,
        panIds: 0,
        customerIds: 0,
        ifscCodes: 0,
        cardNumbers: 0,
        addresses: 0,
        names: 0
      }
    },
    {
      title: "Clean Document",
      description: "No sensitive data found",
      breakdown: {
        accountNumbers: 0,
        mobileNumbers: 0,
        emails: 0,
        panIds: 0,
        customerIds: 0,
        ifscCodes: 0,
        cardNumbers: 0,
        addresses: 0,
        names: 0
      }
    }
  ];

  const showDemo = (index: number) => {
    setCurrentDemo(index);
    setIsVisible(true);
  };

  const hideDemo = () => {
    setIsVisible(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🔐 Security Status Component Demo
        </h1>
        <p className="text-gray-600 mb-6">
          This demo shows how the SecurityStatus component displays different scenarios 
          of sensitive data detection and protection.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {demoScenarios.map((scenario, index) => (
            <Button
              key={index}
              onClick={() => showDemo(index)}
              variant={currentDemo === index && isVisible ? "primary" : "secondary"}
              className="p-4 h-auto text-left"
            >
              <div>
                <div className="font-semibold">{scenario.title}</div>
                <div className="text-sm opacity-75">{scenario.description}</div>
                <div className="text-xs mt-1">
                  Total items: {Object.values(scenario.breakdown).reduce((sum, count) => sum + count, 0)}
                </div>
              </div>
            </Button>
          ))}
        </div>

        <div className="flex gap-4 mb-6">
          <Button onClick={hideDemo} variant="secondary">
            Hide Demo
          </Button>
          <Button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => showDemo(currentDemo), 100);
            }}
            disabled={!isVisible}
          >
            Replay Animation
          </Button>
        </div>

        {/* Demo Security Status */}
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t pt-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Demo: {demoScenarios[currentDemo].title}
            </h3>
            <SecurityStatus
              breakdown={demoScenarios[currentDemo].breakdown}
              isVisible={true}
              isProcessing={false}
              showCountdown={false}
            />
          </motion.div>
        )}
      </Card>

      <Card className="p-6 bg-blue-50">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          How to See This in Production
        </h2>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Go to the <strong>Statements</strong> page</p>
          <p>• Click <strong>"Upload New Statement"</strong></p>
          <p>• Use the <strong>"🔐 Show Security Demo"</strong> button for a quick preview</p>
          <p>• Or upload a real PDF bank statement to see actual security detection</p>
          <p>• The SecurityStatus will appear with a 3-second countdown during processing</p>
        </div>
      </Card>
    </div>
  );
};
