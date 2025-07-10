/**
 * Data Sanitization Utility
 * Detects and masks sensitive information before sending to LLMs
 */

interface SanitizationConfig {
  // Enable/disable specific sanitization rules
  enableAccountNumberSanitization: boolean;
  enableMobileNumberSanitization: boolean;
  enableEmailSanitization: boolean;
  enablePanIdSanitization: boolean;
  enableCustomerIdSanitization: boolean;
  enableIFSCCodeSanitization: boolean;
  enableCardNumberSanitization: boolean;
  enableAddressSanitization: boolean;
  enableNameSanitization: boolean;
  
  // Masking character
  maskingCharacter: string;
  
  // Whether to preserve format (e.g., keep hyphens in account numbers)
  preserveFormat: boolean;
  
  // Enable detailed logging of sanitization actions
  enableLogging: boolean;
}

interface SanitizationResult {
  sanitizedText: string;
  detectedPatterns: Array<{
    type: string;
    original: string;
    masked: string;
    position: number;
  }>;
  summary: {
    accountNumbers: number;
    mobileNumbers: number;
    emails: number;
    panIds: number;
    customerIds: number;
    ifscCodes: number;
    cardNumbers: number;
    addresses: number;
    names: number;
  };
}

/**
 * Comprehensive data sanitization patterns for Indian banking data
 */
const SANITIZATION_PATTERNS = {
  // Bank account numbers (various formats)
  accountNumber: [
    /\b\d{9,18}\b/g, // Standard account numbers
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,6}\b/g, // Formatted account numbers
    /\bAC[.\s]?NO[.\s]?:?\s*\d{9,18}\b/gi, // Account No: prefix
    /\bACCOUNT[.\s]?NUMBER[.\s]?:?\s*\d{9,18}\b/gi, // Account Number: prefix
  ],

  // Credit/Debit card numbers
  cardNumber: [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Standard card format
    /\b\d{15,16}\b/g, // Continuous card numbers
  ],

  // Mobile numbers (Indian format)
  mobileNumber: [
    /\b[+]?91[\s-]?[6-9]\d{9}\b/g, // +91 prefix
    /\b[6-9]\d{9}\b/g, // 10-digit mobile
    /\b0[6-9]\d{9}\b/g, // With leading 0
  ],

  // Email addresses
  email: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ],

  // PAN ID (Indian tax identifier)
  panId: [
    /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    /\bPAN[.\s]?:?\s*[A-Z]{5}\d{4}[A-Z]\b/gi,
  ],

  // Customer ID patterns
  customerId: [
    /\bCUST[.\s]?ID[.\s]?:?\s*[A-Z0-9]{6,15}\b/gi,
    /\bCUSTOMER[.\s]?ID[.\s]?:?\s*[A-Z0-9]{6,15}\b/gi,
    /\bCIF[.\s]?:?\s*[A-Z0-9]{6,15}\b/gi, // Customer Information File
    /\bID[.\s]?:?\s*[A-Z0-9]{8,15}\b/gi, // Generic ID patterns
  ],

  // IFSC codes (Indian bank codes)
  ifscCode: [
    /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    /\bIFSC[.\s]?:?\s*[A-Z]{4}0[A-Z0-9]{6}\b/gi,
  ],

  // Common Indian names (basic pattern matching)
  name: [
    /\bMR[.\s]+[A-Z][A-Z\s]{2,30}\b/gi,
    /\bMRS[.\s]+[A-Z][A-Z\s]{2,30}\b/gi,
    /\bMS[.\s]+[A-Z][A-Z\s]{2,30}\b/gi,
    /\bDR[.\s]+[A-Z][A-Z\s]{2,30}\b/gi,
  ],

  // Address patterns (basic)
  address: [
    /\b\d{1,4}[\/\-,\s]+[A-Z][A-Za-z\s,]{10,50}[,\s]+[A-Z][A-Za-z\s]{5,20}[\s-]*\d{6}\b/g, // Address with pincode
    /\bPIN[.\s]?:?\s*\d{6}\b/gi, // PIN codes
  ],
};

/**
 * Default sanitization configuration
 */
const DEFAULT_CONFIG: SanitizationConfig = {
  enableAccountNumberSanitization: true,
  enableMobileNumberSanitization: true,
  enableEmailSanitization: true,
  enablePanIdSanitization: true,
  enableCustomerIdSanitization: true,
  enableIFSCCodeSanitization: true,
  enableCardNumberSanitization: true,
  enableAddressSanitization: true,
  enableNameSanitization: false, // More aggressive, disabled by default
  maskingCharacter: '*',
  preserveFormat: true,
  enableLogging: true,
};

/**
 * Masks a string while optionally preserving format
 */
function maskString(input: string, maskChar: string, preserveFormat: boolean): string {
  if (!preserveFormat) {
    return maskChar.repeat(input.length);
  }

  // Preserve format characters like spaces, hyphens, dots
  return input.replace(/[A-Za-z0-9]/g, maskChar);
}

/**
 * Sanitizes text by detecting and masking sensitive information
 */
export function sanitizeText(text: string, config: Partial<SanitizationConfig> = {}): SanitizationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let sanitizedText = text;
  const detectedPatterns: SanitizationResult['detectedPatterns'] = [];
  const summary: SanitizationResult['summary'] = {
    accountNumbers: 0,
    mobileNumbers: 0,
    emails: 0,
    panIds: 0,
    customerIds: 0,
    ifscCodes: 0,
    cardNumbers: 0,
    addresses: 0,
    names: 0,
  };

  // Helper function to apply pattern sanitization
  const applyPatternSanitization = (
    patterns: RegExp[],
    type: keyof SanitizationResult['summary'],
    enabled: boolean
  ) => {
    if (!enabled) return;

    patterns.forEach(pattern => {
      const matches = Array.from(sanitizedText.matchAll(pattern));
      matches.forEach(match => {
        if (match[0] && match.index !== undefined) {
          const original = match[0];
          const masked = maskString(original, finalConfig.maskingCharacter, finalConfig.preserveFormat);
          
          // Replace in the text
          sanitizedText = sanitizedText.replace(original, masked);
          
          // Track detection
          detectedPatterns.push({
            type,
            original,
            masked,
            position: match.index,
          });
          
          summary[type]++;
        }
      });
    });
  };

  // Apply sanitization patterns
  applyPatternSanitization(
    SANITIZATION_PATTERNS.accountNumber,
    'accountNumbers',
    finalConfig.enableAccountNumberSanitization
  );

  applyPatternSanitization(
    SANITIZATION_PATTERNS.cardNumber,
    'cardNumbers',
    finalConfig.enableCardNumberSanitization
  );

  applyPatternSanitization(
    SANITIZATION_PATTERNS.mobileNumber,
    'mobileNumbers',
    finalConfig.enableMobileNumberSanitization
  );

  applyPatternSanitization(
    SANITIZATION_PATTERNS.email,
    'emails',
    finalConfig.enableEmailSanitization
  );

  applyPatternSanitization(
    SANITIZATION_PATTERNS.panId,
    'panIds',
    finalConfig.enablePanIdSanitization
  );

  applyPatternSanitization(
    SANITIZATION_PATTERNS.customerId,
    'customerIds',
    finalConfig.enableCustomerIdSanitization
  );

  applyPatternSanitization(
    SANITIZATION_PATTERNS.ifscCode,
    'ifscCodes',
    finalConfig.enableIFSCCodeSanitization
  );

  applyPatternSanitization(
    SANITIZATION_PATTERNS.address,
    'addresses',
    finalConfig.enableAddressSanitization
  );

  applyPatternSanitization(
    SANITIZATION_PATTERNS.name,
    'names',
    finalConfig.enableNameSanitization
  );

  // Log sanitization actions if enabled
  if (finalConfig.enableLogging && detectedPatterns.length > 0) {
    console.log('🔐 Data Sanitization Summary:', {
      totalDetections: detectedPatterns.length,
      breakdown: summary,
      samplesDetected: detectedPatterns.slice(0, 3).map(p => `${p.type}: ${p.original} → ${p.masked}`),
    });
  }

  return {
    sanitizedText,
    detectedPatterns,
    summary,
  };
}

/**
 * Get sanitization configuration from environment variables
 */
export function getSanitizationConfig(): SanitizationConfig {
  return {
    enableAccountNumberSanitization: process.env.NEXT_PUBLIC_SANITIZE_ACCOUNT_NUMBERS !== 'false',
    enableMobileNumberSanitization: process.env.NEXT_PUBLIC_SANITIZE_MOBILE_NUMBERS !== 'false',
    enableEmailSanitization: process.env.NEXT_PUBLIC_SANITIZE_EMAILS !== 'false',
    enablePanIdSanitization: process.env.NEXT_PUBLIC_SANITIZE_PAN_IDS !== 'false',
    enableCustomerIdSanitization: process.env.NEXT_PUBLIC_SANITIZE_CUSTOMER_IDS !== 'false',
    enableIFSCCodeSanitization: process.env.NEXT_PUBLIC_SANITIZE_IFSC_CODES !== 'false',
    enableCardNumberSanitization: process.env.NEXT_PUBLIC_SANITIZE_CARD_NUMBERS !== 'false',
    enableAddressSanitization: process.env.NEXT_PUBLIC_SANITIZE_ADDRESSES !== 'false',
    enableNameSanitization: process.env.NEXT_PUBLIC_SANITIZE_NAMES === 'true', // Disabled by default
    maskingCharacter: process.env.NEXT_PUBLIC_SANITIZATION_MASK_CHARACTER || '*',
    preserveFormat: process.env.NEXT_PUBLIC_SANITIZATION_PRESERVE_FORMAT !== 'false',
    enableLogging: process.env.NEXT_PUBLIC_SANITIZATION_LOGGING !== 'false',
  };
}

/**
 * Convenience function with default environment-based configuration
 */
export function sanitizeTextForLLM(text: string): SanitizationResult {
  const config = getSanitizationConfig();
  return sanitizeText(text, config);
}
