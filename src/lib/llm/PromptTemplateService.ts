/**
 * Centralized Prompt Template Service
 * 
 * This service manages all LLM prompts in one place to avoid duplication
 * and make it easy to maintain and update prompts for all models and endpoints.
 */

import { Category } from '@/types';

export interface PromptVariables {
  [key: string]: string | number | boolean | Category[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  requiredVariables: string[];
}

/**
 * Core prompt template builder class
 */
export class PromptTemplateService {
  private static instance: PromptTemplateService;
  private templates: Map<string, PromptTemplate> = new Map();

  private constructor() {
    this.initializeTemplates();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PromptTemplateService {
    if (!PromptTemplateService.instance) {
      PromptTemplateService.instance = new PromptTemplateService();
    }
    return PromptTemplateService.instance;
  }

  /**
   * Initialize all prompt templates
   */
  private initializeTemplates(): void {
    // Transaction extraction prompt template
    this.registerTemplate({
      id: 'transaction_extraction',
      name: 'Transaction Extraction',
      description: 'Extracts transaction data from bank statements with balance detection',
      template: `
    Analyze the bank statement or transaction data provided below and extract individual transactions AND balance information. Your goal is to create a structured list of financial transactions with accurate categorization AND detect account balance data.

    Return ONLY valid JSON with the following structure:

    {
      "transactions": [
        {
          "date": "YYYY-MM-DD",
          "description": "exact original transaction description as it appears in the statement",
          "amount": number (positive for money IN/credits, negative for money OUT/debits),
          "suggested_category": "{{categoriesDescription}}"
        }
      ],
      "balance_data": {
        "opening_balance": number or null,
        "closing_balance": number or null,
        "available_balance": number or null,
        "current_balance": number or null,
        "balance_confidence": number (0-100),
        "balance_extraction_notes": "description of balance data found or issues"
      }
    }

    Critical Guidelines:
    1. **Amount Signs (VERY IMPORTANT)**: 
       - Money COMING IN (deposits, salary, refunds, interest earned) = POSITIVE amount (+7000)
       - Money GOING OUT (expenses, withdrawals, payments, fees) = NEGATIVE amount (-7000)
       - Look at the transaction type indicators: "Dr" or "Debit" = negative, "Cr" or "Credit" = positive
       - If balance increases after transaction = positive amount
       - If balance decreases after transaction = negative amount
       - Most regular expenses should be negative amounts
    
    2. **Description Preservation**: Keep the original transaction description EXACTLY as it appears in the statement. Do NOT modify, clean, or shorten the description. Users need to see the complete original text to make proper categorization decisions.
    
    {{categorizationGuidelines}}
    
    4. **Balance Detection (NEW FEATURE)**: 
       - Look for balance information in headers, footers, or balance columns
       - Common balance labels: "Opening Balance", "Closing Balance", "Available Balance", "Current Balance", "Outstanding Balance"
       - Balance amounts are typically larger numbers that appear at statement start/end
       - Assign confidence score based on how clear the balance information is:
         * 90-100: Clearly labeled balance with obvious amount
         * 70-89: Balance amount found but label is unclear
         * 40-69: Probable balance based on context clues
         * 20-39: Possible balance but uncertain
         * 0-19: No clear balance information found
       - If no balance found, set all balance fields to null and confidence to 0
       - Include notes about what balance information was found or why none was detected
    
    5. **Data Filtering**: 
       - Ignore opening/closing balance entries IN THE TRANSACTIONS LIST (but DO extract them for balance_data)
       - Skip summary rows and totals in transactions
       - Focus only on individual transaction line items for transactions array
    
    6. **Multi-line Handling**: If transaction data spans multiple lines (common in Indian bank statements), merge them into a single coherent entry while preserving the complete description.
    
    7. **Date Formatting**: Convert all dates to YYYY-MM-DD format regardless of the source format.

    Text to analyze:
    {{sanitizedPageText}}

    Return ONLY the JSON object, no additional text or formatting.
    `,
      requiredVariables: ['categoriesDescription', 'categorizationGuidelines', 'sanitizedPageText']
    });

    // Bank statement validation prompt template (for future use)
    this.registerTemplate({
      id: 'bank_validation',
      name: 'Bank Statement Validation',
      description: 'Validates bank name and statement month/period',
      template: `
    Analyze the bank statement document and extract the following information:

    Return ONLY valid JSON with the following structure:

    {
      "bank_name": "extracted bank name",
      "statement_period": {
        "from_date": "YYYY-MM-DD",
        "to_date": "YYYY-MM-DD",
        "month": "YYYY-MM"
      },
      "account_number": "last 4 digits only",
      "is_valid_statement": boolean,
      "validation_notes": "any issues or observations"
    }

    Guidelines:
    1. **Bank Name Detection**: Look for official bank logos, letterheads, or bank names in headers/footers
    2. **Period Extraction**: Find statement period, usually at the top of the document
    3. **Account Security**: Only extract last 4 digits of account numbers for security
    4. **Validation**: Check if this looks like a legitimate bank statement

    Document text to analyze:
    {{documentText}}

    Return ONLY the JSON object, no additional text or formatting.
    `,
      requiredVariables: ['documentText']
    });

    // Generic connection test prompt
    this.registerTemplate({
      id: 'connection_test',
      name: 'Connection Test',
      description: 'Simple prompt to test LLM endpoint connectivity',
      template: 'Test connection - please respond with a simple greeting.',
      requiredVariables: []
    });
  }

  /**
   * Register a new prompt template
   */
  public registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get a prompt template by ID
   */
  public getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all available templates
   */
  public getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Build a prompt from template with variable substitution
   */
  public buildPrompt(templateId: string, variables: PromptVariables): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }

    // Check for required variables
    const missingVariables = template.requiredVariables.filter(
      varName => !(varName in variables)
    );
    
    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required variables for template '${templateId}': ${missingVariables.join(', ')}`
      );
    }

    // Replace variables in template
    let prompt = template.template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = this.formatVariableValue(value);
      prompt = prompt.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    return prompt.trim();
  }

  /**
   * Format variable value for insertion into prompt
   */
  private formatVariableValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Validate that a template has all required variables
   */
  public validateTemplate(templateId: string, variables: PromptVariables): {
    isValid: boolean;
    missingVariables: string[];
  } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return {
        isValid: false,
        missingVariables: [`Template '${templateId}' not found`]
      };
    }

    const missingVariables = template.requiredVariables.filter(
      varName => !(varName in variables)
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }
}

/**
 * Helper class for building transaction extraction prompts with category logic
 */
export class TransactionExtractionPromptBuilder {
  private promptService: PromptTemplateService;

  constructor() {
    this.promptService = PromptTemplateService.getInstance();
  }

  /**
   * Build transaction extraction prompt with user categories
   */
  public buildTransactionExtractionPrompt(
    sanitizedPageText: string,
    userCategories: Category[] = []
  ): string {
    // Build category description based on user categories
    const categoriesDescription = this.buildCategoriesDescription(userCategories);
    
    // Build categorization guidelines based on user categories
    const categorizationGuidelines = this.buildCategorizationGuidelines(userCategories);

    return this.promptService.buildPrompt('transaction_extraction', {
      categoriesDescription,
      categorizationGuidelines,
      sanitizedPageText
    });
  }

  /**
   * Build categories description text
   */
  private buildCategoriesDescription(userCategories: Category[]): string {
    let categoriesDescription = "automatically classified category based on description";
    
    if (userCategories.length > 0) {
      const categoryNames = userCategories.map(cat => cat.name).join(', ');
      categoriesDescription = `one of the user's preferred categories: ${categoryNames}`;
    } else {
      categoriesDescription += " (e.g., food, transport, insurance, interest, transfer, etc.)";
    }

    return categoriesDescription;
  }

  /**
   * Build categorization guidelines text
   */
  private buildCategorizationGuidelines(userCategories: Category[]): string {
    if (userCategories.length > 0) {
      return `3. **Smart Categorization - Think Like a Human Bank Statement Expert**: You are an experienced financial analyst who has read thousands of bank statements. Use your human expertise to understand transaction patterns and context. ONLY use the user's preferred categories listed above. Analyze the transaction description like a human expert would - look for subtle clues, abbreviations, and patterns that indicate the true nature of each transaction. Match to the most appropriate category from the user's list based on your expert understanding. If the description doesn't clearly match any of the user's categories, use "Uncategorized" instead of guessing.`;
    } else {
      return `3. **Smart Categorization - Think Like a Human Bank Statement Expert**: You are an experienced financial analyst who has read thousands of bank statements. Use your human expertise to understand transaction patterns, decode abbreviations, and infer the true purpose behind each transaction. Think like a human expert when analyzing descriptions:
       - Fuel stations, petrol pumps, gas stations → "transport" (e.g., "Fuel S/", "Petrol Pump", "HP Petrol")
       - Restaurants, food delivery, groceries → "food" (e.g., "Zomato", "Swiggy", "Restaurant", "Cafe")
       - Shopping malls, retail stores, e-commerce → "shopping" (e.g., "Amazon", "Flipkart", "Mall", "Store")
       - Utility bills, electricity, water, phone → "utilities" (e.g., "BSES", "Airtel", "Jio", "Water Bill")
       - ATM withdrawals, cash transactions → "cash_withdrawal" (e.g., "ATM WDL", "CASH")
       - Salary, wages, employment income → "salary" (e.g., "SALARY", "PAY", "WAGES")
       - Investments, mutual funds, stocks → "investment" (e.g., "SIP", "MF", "INVESTMENT")
       - Insurance premiums → "insurance" (e.g., "LIC", "INSURANCE", "PREMIUM")
       - Bank transfers, NEFT, RTGS → "transfer" (e.g., "NEFT", "RTGS", "TRANSFER")
       - Interest earned from banks → "interest" (e.g., "INT PAID", "INTEREST")
       - Bank charges, fees → "fees" (e.g., "CHARGES", "FEE", "PENALTY")
       - Medical expenses, hospitals, pharmacy → "healthcare" (e.g., "HOSPITAL", "MEDICAL", "PHARMACY")
       - Transportation, taxi, bus, metro → "transport" (e.g., "UBER", "OLA", "METRO", "BUS")
       
       **Think Like a Human Expert**: Use your expertise to recognize patterns, decode banking abbreviations, understand merchant codes, and infer transaction purpose from contextual clues. If the description doesn't clearly indicate a specific category even with your expert analysis, use "Uncategorized" rather than making an incorrect guess. It's better to be accurate than to mislead the user.`;
    }
  }

  /**
   * Build bank validation prompt (for future use)
   */
  public buildBankValidationPrompt(documentText: string): string {
    return this.promptService.buildPrompt('bank_validation', {
      documentText
    });
  }

  /**
   * Build connection test prompt
   */
  public buildConnectionTestPrompt(): string {
    return this.promptService.buildPrompt('connection_test', {});
  }
}

// Export singleton instances for easy use
export const promptTemplateService = PromptTemplateService.getInstance();
export const transactionPromptBuilder = new TransactionExtractionPromptBuilder();
