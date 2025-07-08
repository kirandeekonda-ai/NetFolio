import { NextApiRequest, NextApiResponse } from 'next';

interface ModelsResponse {
  available_models: string[];
  recommended: string;
  note: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModelsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      available_models: [],
      recommended: '',
      note: 'Method not allowed'
    });
  }

  // List of known working Gemini models
  const availableModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.0-pro'
  ];

  const response: ModelsResponse = {
    available_models: availableModels,
    recommended: 'gemini-2.0-flash',
    note: 'Updated to include Gemini 2.0 Flash as the recommended model.'
  };

  res.status(200).json(response);
}
