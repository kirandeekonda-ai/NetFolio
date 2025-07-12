# Data Sanitization System

This document describes the comprehensive data sanitization system implemented to protect sensitive information before sending prompts to any Large Language Model (LLM) provider.

## Overview

The data sanitization system automatically detects and masks sensitive information such as account numbers, mobile numbers, email addresses, PAN IDs, customer IDs, IFSC codes, card numbers, and addresses before sending any text to LLM providers.

## Features

### 🔐 Comprehensive Pattern Detection
- **Bank Account Numbers**: Various formats (9-18 digits, formatted with spaces/hyphens)
- **Credit/Debit Card Numbers**: 15-16 digit cards in various formats
- **Mobile Numbers**: Indian mobile numbers (+91, 10-digit, with/without country code)
- **Email Addresses**: Standard email format detection
- **PAN IDs**: Indian tax identifier format (5 letters + 4 digits + 1 letter)
- **Customer IDs**: Bank customer identification numbers and CIF numbers
- **IFSC Codes**: Indian bank branch codes
- **Addresses**: Basic address patterns with PIN codes
- **Names**: Common title-based name patterns (MR., MRS., MS., DR.)

### 🎛️ Configurable Sanitization
- Enable/disable specific sanitization rules
- Configurable masking character (default: `*`)
- Option to preserve format (keep spaces, hyphens, etc.)
- Environment variable-based configuration

### 📊 Detailed Logging and Auditing
- Summary of detected patterns
- Position tracking of sanitized content
- Audit trail of what was sanitized
- Configurable logging levels

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# Control what sensitive data to sanitize before sending to LLMs
NEXT_PUBLIC_SANITIZE_ACCOUNT_NUMBERS=true
NEXT_PUBLIC_SANITIZE_MOBILE_NUMBERS=true
NEXT_PUBLIC_SANITIZE_EMAILS=true
NEXT_PUBLIC_SANITIZE_PAN_IDS=true
NEXT_PUBLIC_SANITIZE_CUSTOMER_IDS=true
NEXT_PUBLIC_SANITIZE_IFSC_CODES=true
NEXT_PUBLIC_SANITIZE_CARD_NUMBERS=true
NEXT_PUBLIC_SANITIZE_ADDRESSES=true
NEXT_PUBLIC_SANITIZE_NAMES=false  # More aggressive, disabled by default

# Sanitization behavior
NEXT_PUBLIC_SANITIZATION_MASK_CHARACTER=*
NEXT_PUBLIC_SANITIZATION_PRESERVE_FORMAT=true
NEXT_PUBLIC_SANITIZATION_LOGGING=true
```

### Programmatic Configuration

```typescript
import { sanitizeText } from '@/utils/dataSanitization';

const result = sanitizeText(text, {
  enableAccountNumberSanitization: true,
  enableMobileNumberSanitization: true,
  enableEmailSanitization: true,
  maskingCharacter: '#',
  preserveFormat: true,
  enableLogging: true,
});
```

## Usage

### Automatic Integration

The sanitization is automatically applied in all LLM service implementations:

- `GeminiService.extractTransactions()`
- `CustomEndpointService.extractTransactions()`
- `AzureOpenAIService.extractTransactions()`
- `OpenAIService.extractTransactions()`

### Manual Usage

```typescript
import { sanitizeTextForLLM, sanitizeText } from '@/utils/dataSanitization';

// Use with environment-based configuration
const result = sanitizeTextForLLM(bankStatementText);

// Use with custom configuration
const result = sanitizeText(bankStatementText, {
  enableAccountNumberSanitization: true,
  enableMobileNumberSanitization: true,
  enableEmailSanitization: false,
  maskingCharacter: 'X',
});

console.log('Sanitized text:', result.sanitizedText);
console.log('Detection summary:', result.summary);
console.log('Detected patterns:', result.detectedPatterns);
```

## Detection Patterns

### Account Numbers
- `123456789012345` → `***************`
- `1234 5678 9012 3456` → `**** **** **** ****`
- `AC NO: 123456789012` → `AC NO: ************`

### Mobile Numbers
- `+91-9876543210` → `+**-**********`
- `9876543210` → `**********`

### Email Addresses
- `user@example.com` → `****@*******.**`

### PAN IDs
- `ABCDE1234F` → `**********`
- `PAN: ABCDE1234F` → `PAN: **********`

### Card Numbers
- `4532 1234 5678 9012` → `**** **** **** ****`
- `4532123456789012` → `****************`

### Customer IDs
- `CUST ID: ABC123456` → `CUST ID: *********`
- `CIF: XYZ789012` → `CIF: *********`

### IFSC Codes
- `ICIC0001234` → `***********`
- `IFSC: ICIC0001234` → `IFSC: ***********`

## Security Benefits

### 🛡️ Data Protection
- **Prevents data leakage** to external LLM providers
- **Maintains transaction functionality** while protecting sensitive data
- **Complies with data privacy** requirements

### 🔍 Transparency
- **Audit logging** of all sanitization actions
- **Detailed reporting** of what patterns were detected
- **Configurable sensitivity** levels

### ⚡ Performance
- **Efficient regex patterns** for fast processing
- **Minimal impact** on LLM processing speed
- **Smart pattern matching** to avoid false positives

## Example Output

### Before Sanitization
```
ICICI BANK LIMITED
Customer: MR. RAJESH KUMAR
Account: 123456789012345
Mobile: +91-9876543210
Email: rajesh@example.com
PAN: ABCDE1234F
```

### After Sanitization
```
ICICI BANK LIMITED
Customer: **. ****** *****
Account: ***************
Mobile: +**-**********
Email: ******@*******.**
PAN: **********
```

### Sanitization Summary
```json
{
  "accountNumbers": 1,
  "mobileNumbers": 1,
  "emails": 1,
  "panIds": 1,
  "customerIds": 0,
  "ifscCodes": 0,
  "cardNumbers": 0,
  "addresses": 0,
  "names": 1
}
```

## Testing

Run the test suite to verify sanitization:

```bash
cd src/utils
node -r ts-node/register dataSanitization.test.ts
```

Or import and test in your application:

```typescript
import { sanitizeText } from '@/utils/dataSanitization';

// Test with sample bank statement data
const sampleText = "Account: 123456789012345, Mobile: 9876543210";
const result = sanitizeText(sampleText);
console.log(result.sanitizedText); // "Account: ***************, Mobile: **********"
```

## Implementation Details

### File Structure
```
src/utils/
├── dataSanitization.ts      # Main sanitization utility
├── dataSanitization.test.ts # Test suite
└── ...
```

### Integration Points
```
src/lib/llm/
├── GeminiService.ts         # ✅ Integrated
├── CustomEndpointService.ts # ✅ Integrated  
├── LLMProviderFactory.ts    # ✅ Integrated (Azure OpenAI, OpenAI)
└── ...
```

## Best Practices

### 🔧 Configuration Recommendations
1. **Enable all sanitization** in production environments
2. **Use environment variables** for configuration management
3. **Enable logging** for audit purposes
4. **Test patterns** with your specific bank statement formats

### 🚨 Security Considerations
1. **Review sanitization logs** regularly
2. **Update patterns** as new sensitive data formats are discovered
3. **Monitor false positives** and adjust patterns accordingly
4. **Ensure compliance** with your organization's data privacy policies

### 🎯 Performance Optimization
1. **Cache sanitization results** for repeated text processing
2. **Profile regex performance** for large documents
3. **Consider async processing** for very large files

## Future Enhancements

### 🔮 Planned Features
- **Machine learning-based detection** for more sophisticated patterns
- **Custom pattern configuration** through UI
- **International format support** for global banking systems
- **Encryption of detected sensitive data** instead of masking
- **Integration with data loss prevention (DLP)** systems

---

**Status**: ✅ Feature Complete and Production Ready
**Security Level**: High - Comprehensive protection for Indian banking data
**Performance Impact**: Minimal - Efficient regex-based processing
