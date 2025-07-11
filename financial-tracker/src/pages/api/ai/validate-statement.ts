/**
 * API endpoint for statement validation
 * Validates that a bank statement matches the expected bank, month, and year
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createLLMProvider } from '../../../lib/llm/LLMProviderFactory';
import { getActiveLLMProvider } from '../../../lib/llm/config';
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

    // Use existing LLM provider instead of making HTTP calls
    const providerConfig = getActiveLLMProvider();
    const llmProvider = createLLMProvider(providerConfig);
    
    console.log('🔍 VALIDATION - Complete prompt being sent to LLM:');
    console.log('=' .repeat(80));
    console.log(prompt);
    console.log('=' .repeat(80));
    
    // Instead of using extractTransactions, make a direct HTTP call for validation
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provider has one
    if (providerConfig.api_key) {
      headers['Authorization'] = `Bearer ${providerConfig.api_key}`;
    }

    let llmResult;
    if (providerConfig.provider_type === 'custom') {
      // For custom endpoint, make direct HTTP call
      const response = await fetch(providerConfig.api_endpoint || '', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: prompt
        }),
      });

      if (!response.ok) {
        throw new Error('LLM service request failed');
      }

      const data = await response.json();
      const text = data.response;
      console.log('🔍 VALIDATION - Raw LLM response text:', text);
      
      // Parse the JSON response from the validation
      try {
        // Extract JSON from the response if it's wrapped in markdown
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        llmResult = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse validation response:', parseError);
        // Use original content for fallback validation (bank detection needs unsanitized data)
        llmResult = createFallbackValidation(bankName, month, year, pageContent);
      }
    } else {
      // For other providers, use the existing service but parse differently
      const extractionResult = await llmProvider.extractTransactions(prompt, []);
      console.log('🔍 VALIDATION - LLM extraction result:', JSON.stringify(extractionResult, null, 2));
      
      // The validation prompt should return JSON, try to parse from any text in the result
      const possibleJson = JSON.stringify(extractionResult.transactions);
      try {
        llmResult = JSON.parse(possibleJson);
      } catch {
        // Fallback validation based on original text content (needs unsanitized data for bank detection)
        llmResult = createFallbackValidation(bankName, month, year, pageContent);
      }
    }

    // Parse the JSON response from LLM
    let validationResult;
    try {
      // For validation, we expect a different format than transaction extraction
      console.log('🔍 VALIDATION - Parsing LLM result:', llmResult);
      validationResult = llmResult;
    } catch (parseError) {
      console.error('Failed to parse LLM validation response, creating fallback result');
      // Use original content for fallback validation (bank detection needs unsanitized data)
      validationResult = createFallbackValidation(bankName, month, year, pageContent);
    }

    // Ensure all required fields are present
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
    console.error('Error in statement validation:', error);
    res.status(500).json({
      isValid: false,
      bankMatches: false,
      monthMatches: false,
      yearMatches: false,
      errorMessage: error instanceof Error ? error.message : 'Validation service error',
      detectedBank: null,
      detectedMonth: null,
      detectedYear: null,
      confidence: 0
    });
  }
}
