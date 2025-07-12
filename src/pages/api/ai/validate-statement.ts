/**
 * API endpoint for statement validation
 * Validates that a bank statement matches the expected bank, month, and year
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createLLMProvider } from '../../../lib/llm/LLMProviderFactory';
import { routeLLMRequest } from '../../../lib/llm/LLMRoutingService';
import { sanitizeTextForLLM } from '../../../utils/dataSanitization';

// Validation prompt template
const createValidationPrompt = (bankName: string, month: string, year: string, pageContent: string) => {
  return `You are a specialized financial statement validator working for a smart personal finance app.

Your task is to validate that the provided bank statement content matches the specified criteria before processing transactions.

**VALIDATION REQUIREMENTS:**
- Bank Name: ${bankName}
- Statement Month: ${month}
- Statement Year: ${year}

**STATEMENT CONTENT TO VALIDATE:**
${pageContent}

**VALIDATION INSTRUCTIONS:**
1. Carefully examine the statement content for bank name, month, and year information
2. Look for headers, footers, dates, and bank identifiers
3. Check if the statement belongs to the specified bank: "${bankName}"
4. Verify if the statement is from the specified month: "${month}"
5. Confirm if the statement is from the specified year: "${year}"

Return ONLY a JSON response with this exact structure:

{
  "isValid": boolean,
  "bankMatches": boolean,
  "monthMatches": boolean,
  "yearMatches": boolean,
  "errorMessage": "string or null",
  "detectedBank": "detected bank name or null",
  "detectedMonth": "detected month or null",
  "detectedYear": "detected year or null",
  "confidence": number (0-100)
}

**VALIDATION RULES:**
- Set isValid to true only if ALL criteria match (bank, month, year)
- Provide specific error messages for mismatches
- Include confidence score based on clarity of statement information
- Be flexible with bank name variations (e.g., "HDFC Bank" vs "HDFC")
- Accept month in various formats (MM, MMM, full month name)

**ERROR MESSAGE EXAMPLES:**
- "Statement bank 'ICICI Bank' does not match expected bank 'HDFC Bank'"
- "Statement month 'March' does not match expected month 'February'"
- "Statement year '2023' does not match expected year '2024'"
- "Unable to detect bank information in the statement"

Return ONLY the JSON. No explanations or additional text.`;
};

// Helper function to create fallback validation
function createFallbackValidation(bankName: string, month: string, year: string, pageContent: string) {
  const textLower = pageContent.toLowerCase();
  const bankNameLower = bankName.toLowerCase();
  const monthLower = month.toLowerCase();
  const yearStr = year.toString();
  
  const bankMatches = textLower.includes(bankNameLower) || 
                     textLower.includes(bankNameLower.replace(' bank', '')) ||
                     textLower.includes(bankNameLower.split(' ')[0]);
  
  const monthMatches = textLower.includes(monthLower) ||
                      textLower.includes(monthLower.substring(0, 3)) ||
                      pageContent.includes(year + '-' + String(getMonthNumber(month)).padStart(2, '0'));
  
  const yearMatches = pageContent.includes(yearStr);
  
  const isValid = bankMatches && monthMatches && yearMatches;
  
  return {
    isValid,
    bankMatches,
    monthMatches,
    yearMatches,
    errorMessage: isValid ? null : `Validation failed - Bank: ${bankMatches ? 'OK' : 'FAIL'}, Month: ${monthMatches ? 'OK' : 'FAIL'}, Year: ${yearMatches ? 'OK' : 'FAIL'}`,
    detectedBank: bankMatches ? bankName : null,
    detectedMonth: monthMatches ? month : null,
    detectedYear: yearMatches ? year : null,
    confidence: isValid ? 85 : 30
  };
}

// Helper function to get month number
function getMonthNumber(monthName: string): number {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const index = months.findIndex(m => m.startsWith(monthName.toLowerCase().substring(0, 3)));
  return index >= 0 ? index + 1 : 1;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bankName, month, year, pageContent } = req.body;

    console.log('🔍 VALIDATION - Request details:');
    console.log('Expected Bank:', bankName);
    console.log('Expected Month:', month); 
    console.log('Expected Year:', year);
    console.log('Statement content preview:', pageContent.substring(0, 300));

    if (!bankName || !month || !year || !pageContent) {
      return res.status(400).json({ 
        error: 'Missing required fields: bankName, month, year, pageContent' 
      });
    }

    // Sanitize the page content before sending to LLM for validation
    const sanitizationResult = sanitizeTextForLLM(pageContent);
    const sanitizedPageContent = sanitizationResult.sanitizedText;
    
    // Log sanitization summary for validation
    if (sanitizationResult.detectedPatterns.length > 0) {
      console.log('🔐 VALIDATION - Sanitized sensitive data before sending to LLM');
      console.log('🔐 VALIDATION - Sanitization summary:', sanitizationResult.summary);
    } else {
      console.log('🔐 VALIDATION - No sensitive data detected in statement');
    }

    // Create validation prompt with sanitized content
    const prompt = createValidationPrompt(bankName, month, year, sanitizedPageContent);

    // Use the new LLM routing service to get the appropriate provider
    const routingResult = await routeLLMRequest(req, res);
    
    if (!routingResult.success || !routingResult.provider) {
      console.error('❌ LLM routing failed:', routingResult.error);
      return res.status(400).json({ 
        error: routingResult.error || 'No LLM provider configured'
      });
    }

    const providerConfig = routingResult.provider;
    console.log(`✅ Using LLM provider (${routingResult.source}):`, providerConfig.provider_type);
    
    console.log('🔍 VALIDATION - Complete prompt being sent to LLM:');
    console.log('=' .repeat(80));
    console.log(prompt);
    console.log('=' .repeat(80));
    
    let llmResult;

    try {
      if (providerConfig.provider_type === 'custom') {
        // For custom endpoint, make direct HTTP call
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (providerConfig.api_key) {
          headers['Authorization'] = `Bearer ${providerConfig.api_key}`;
        }

        const response = await fetch(providerConfig.api_endpoint || '', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt: prompt
          }),
        });

        if (!response.ok) {
          throw new Error('Custom endpoint validation request failed');
        }

        const data = await response.json();
        const text = data.response;
        console.log('🔍 VALIDATION - Raw custom endpoint response text:', text);
        
        // Parse the JSON response from the validation
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        llmResult = JSON.parse(jsonStr);

      } else if (providerConfig.provider_type === 'gemini') {
        // For Gemini, make direct API call for validation
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(providerConfig.api_key || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        console.log('🔍 VALIDATION - Sending validation prompt to Gemini');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('🔍 VALIDATION - Raw Gemini response text:', text);
        
        // Extract JSON from the response if it's wrapped in markdown
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        llmResult = JSON.parse(jsonStr);

      } else {
        // For Azure OpenAI and other providers, use the provider factory
        const llmProvider = createLLMProvider(providerConfig);
        
        // Use a simple approach - try to get a direct text response
        // Since we can't guarantee all providers have validation methods, 
        // we'll use the transaction extraction method but with validation prompt
        console.log('🔍 VALIDATION - Using provider factory for:', providerConfig.provider_type);
        
        // This is a workaround - we use extractTransactions but with validation prompt
        // The response should be JSON validation, not transactions
        const extractionResult = await llmProvider.extractTransactions(prompt, []);
        
        // For validation, we expect the LLM to return validation JSON in the transactions field
        // or we need to parse it differently
        console.log('🔍 VALIDATION - Provider extraction result:', JSON.stringify(extractionResult, null, 2));
        
        // Try to find validation JSON in the response
        const responseText = JSON.stringify(extractionResult);
        const jsonMatch = responseText.match(/\{[\s\S]*"isValid"[\s\S]*\}/);
        
        if (jsonMatch) {
          llmResult = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback - no valid validation response
          throw new Error('No valid validation response from provider');
        }
      }
    } catch (error) {
      console.error('LLM validation failed:', error);
      
      // Check if this is an LLM service error (API key, network, permissions, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isServiceError = errorMessage.includes('403') || 
                            errorMessage.includes('401') || 
                            errorMessage.includes('Forbidden') ||
                            errorMessage.includes('Unauthorized') ||
                            errorMessage.includes('API key') ||
                            errorMessage.includes('quota') ||
                            errorMessage.includes('GoogleGenerativeAI Error') ||
                            errorMessage.includes('OpenAI Error') ||
                            errorMessage.includes('Azure Error') ||
                            errorMessage.includes('fetch');

      if (isServiceError) {
        // This is an LLM service error - don't fallback, return clear error
        console.error('🚨 LLM Service Error detected:', errorMessage);
        return res.status(400).json({
          isValid: false,
          bankMatches: false,
          monthMatches: false,
          yearMatches: false,
          errorMessage: `LLM service error: ${errorMessage}. Please check your LLM provider configuration and API keys.`,
          detectedBank: null,
          detectedMonth: null,
          detectedYear: null,
          confidence: 0,
          securityBreakdown: sanitizationResult.summary,
          serviceError: true // Flag to indicate this is a service error, not validation logic error
        });
      }
      
      // Only use fallback validation for non-service errors (e.g., parsing issues)
      console.log('🔄 Using fallback validation for non-service error');
      llmResult = createFallbackValidation(bankName, month, year, pageContent);
    }

    // Parse and validate the LLM result
    let validationResult;
    try {
      console.log('🔍 VALIDATION - Parsing LLM result:', llmResult);
      validationResult = llmResult;
      
      // Ensure all required fields are present
      if (typeof validationResult.isValid !== 'boolean') {
        throw new Error('Invalid validation response format');
      }
    } catch (parseError) {
      console.error('Failed to parse LLM validation response, creating fallback result');
      validationResult = createFallbackValidation(bankName, month, year, pageContent);
    }

    // Ensure all required fields are present and include security breakdown
    const result = {
      isValid: validationResult.isValid || false,
      bankMatches: validationResult.bankMatches || false,
      monthMatches: validationResult.monthMatches || false,
      yearMatches: validationResult.yearMatches || false,
      errorMessage: validationResult.errorMessage || null,
      detectedBank: validationResult.detectedBank || null,
      detectedMonth: validationResult.detectedMonth || null,
      detectedYear: validationResult.detectedYear || null,
      confidence: validationResult.confidence || 0,
      securityBreakdown: sanitizationResult.summary // Include security breakdown from validation
    };

    console.log('Statement validation result:', {
      expectedBank: bankName,
      expectedMonth: month,
      expectedYear: year,
      result: result
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('Validation endpoint error:', error);
    res.status(500).json({
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
