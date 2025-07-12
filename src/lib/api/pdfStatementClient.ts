/**
 * Test client for the PDF bank statement processing API
 * Usage: POST /api/statements/pdf
 * 
 * Example using fetch:
 */

export interface SecurityBreakdown {
  accountNumbers: number;
  mobileNumbers: number;
  emails: number;
  panIds: number;
  customerIds: number;
  ifscCodes: number;
  cardNumbers: number;
  addresses: number;
  names: number;
}

export async function uploadPdfStatement(file: File): Promise<{
  transactions: Array<{
    date: string;
    description: string;
    category: string;
    amount: number;
    currency: string;
  }>;
  analytics: {
    pagesProcessed: number;
    inputTokens: number;
    outputTokens: number;
  };
  securityBreakdown?: SecurityBreakdown;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/statements/pdf', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to process PDF');
  }

  return response.json();
}

/**
 * Example usage in a React component:
 * 
 * ```typescript
 * const handleFileUpload = async (file: File) => {
 *   try {
 *     const result = await uploadPdfStatement(file);
 *     console.log('Extracted transactions:', result.transactions);
 *     console.log('Processing analytics:', result.analytics);
 *   } catch (error) {
 *     console.error('Error processing PDF:', error);
 *   }
 * };
 * ```
 */
