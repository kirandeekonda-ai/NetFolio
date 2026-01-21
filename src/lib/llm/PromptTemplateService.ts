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
You are a financial statement parser. Analyze the provided bank statement data and extract individual transactions and balance information. Focus on accurately identifying transaction amounts with correct sign (positive for credits, negative for debits) using all available clues, while preserving details. Return ONLY valid JSON in the following format (and nothing else):

{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Exact original transaction description as it appears in the statement",
      "amount": number (positive for money IN/credits, negative for money OUT/debits),
      "suggested_category": "{{categoriesDescription}}",
      "verification": "PrevBalance (X) - Amount (Y) = CurrBalance (Z)" // Optional but highly recommended to output this reasoning
    }
    // ...additional transactions...
  ],
  "balance_data": {
    "opening_balance": number or null,
    "closing_balance": number or null,
    "available_balance": number or null,
    "current_balance": number or null,
    "balance_confidence": number (0-100),
    "balance_extraction_notes": "notes on how balance data was identified or any issues"
  }
}

Critical Guidelines:

1. **Amount Signs & Balance Validations (THE IRON LAW)**:
   - **MATH IS THE ONLY TRUTH**: You CANNOT rely on valid column alignment because the text is unstructured. You MUST use mathematical logic for every single row:
     - Check: \`Previous Balance\` + \`X\` = \`Current Balance\`  =>  **X is a CREDIT (Deposit)**
     - Check: \`Previous Balance\` - \`Y\` = \`Current Balance\`  =>  **Y is a DEBIT (Withdrawal)**
   - **Step-by-step Execution**:
     1. Identify the **Current Balance** (It is consistently the **LAST** number in the transaction line).
     2. Identify the **Transaction Amount** (It is consistently the number **IMMEDIATELY PRECEDING** the Current Balance).
     3. Compare \`Current Balance\` with the \`Previous Row's Balance\`:
        - \`Current\` < \`Previous\`  => **DEBIT** (Money Out). Double check: \`Previous - Amount = Current\`.
        - \`Current\` > \`Previous\`  => **CREDIT** (Money In). Double check: \`Previous + Amount = Current\`.
   - **Example (Debit)**:
     - Text: "UPI Payment ... 16,800.00 3,45,553.74"
     - Prev Bal: 3,62,353.74
     - Logic: Balance dropped (3.62L -> 3.45L).
     - Calculation: 362353.74 - 16800.00 = 345553.74.
     - Result: **DEBIT** (Withdrawal).
   - **Example (Credit)**:
     - Text: "Refund ... 119.99 3,25,327.73"
     - Prev Bal: 3,25,207.74
     - Logic: Balance rose.
     - Result: **CREDIT** (Deposit).

   - **Ambiguous Case Resolution**: If a transaction line mentions other numbers (e.g. "Ref: 500023"), ignore them. Only the number that mathematically satisfies the balance change is the Amount.

2. **Description Preservation**: Keep the transaction description exactly as it appears in the statement, without modifications or abbreviations. Include all parts of the description (even if they span multiple lines in the statement) so that users have the full details. Do not infer or append any information that isn't in the original text.

3. **Smart Categorization**:
{{categorizationGuidelines}}

4. **Balance Detection (for balance_data)**: Identify key balance figures such as Opening Balance and Closing Balance from the statement (often explicitly labeled, or infer from the first and last balance in the transactions list). Also look for Available Balance or Current Balance if provided. Determine a confidence (0-100) for the extracted balances based on clarity: e.g., clearly labeled values = high confidence (90+), inferred or partially unclear values = lower confidence. If the statement explicitly lists opening/closing balances, include them in balance_data. If no clear balance info is found, use null for those fields and set confidence to 0. Provide a brief note in balance_extraction_notes explaining how balances were identified or any uncertainty.

5. **Data Filtering**: When building the transactions list, ignore non-transaction lines in the statement's body. Do not include the opening balance or closing balance as transactions (they should go into balance_data instead). Similarly, skip any summary rows, totals, or carry-forward balances in the transactions list. Only actual transaction entries (with a date and description) should be in the "transactions" array.

6. **Multi-line & OCR Quirk Handling**: Many Indian bank statements format transactions in tables that can break onto multiple lines or have OCR recognition issues. If a single transaction's details span multiple lines, merge them into one entry. For example, if a description or reference number continues on the next line without a new date, it's part of the previous transaction – combine them so the description is complete. Likewise, if an amount appears on a new line or is split (e.g., "9," on one line and "300.00" on the next), join them to reconstruct the correct amount 9,300.00.

7. **Date Formatting**: Normalize all dates to the format YYYY-MM-DD. Bank statements may use DD-MM-YYYY, DD/MM/YYYY or other formats – convert each transaction date consistently to the ISO format. If the statement uses non-standard or textual date formats, interpret them correctly (e.g., "01-Jan-2025" → 2025-01-01).

Remember: Your output should be JSON only, with no explanatory text. Each transaction entry must have the correct sign on the amount (use the balance changes and statement layout rules above to get this right). Aim for accuracy over guesswork – if you're unsure about a category or a balance, use the guidelines (like confidence score or "others" category) to handle it. The goal is a structured JSON that faithfully represents the statement data with correct debit/credit signs and complete descriptions.

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
      const categoryList = userCategories
        .map(cat => `"${cat.name}"`)
        .join(', ');

      return `3. **Smart Categorization – CRUCIAL REQUIREMENT**: You MUST use ONLY the user's preferred categories listed above. The user has specifically defined these categories: ${categoryList}. 

**CATEGORIZATION RULES:**
- ONLY use categories from this exact list: ${categoryList}
- If you cannot confidently match a transaction to one of these categories, use "Uncategorized"
- Do NOT create new categories or use generic categories not in the user's list
- Look for keyword matches and semantic similarity between transaction descriptions and user category names
- Consider partial matches (e.g., if user has "Medical Bills" and transaction is about "Doctor visit", match to "Medical Bills")
- If user has "Food & Dining" and transaction is from "Restaurant", match to "Food & Dining"
- Prioritize user category names over generic categorization logic

**EXAMPLES OF GOOD MATCHING:**
- User category: "Groceries" + Transaction: "SUPERMARKET PURCHASE" → "Groceries"
- User category: "Car Expenses" + Transaction: "PETROL PUMP" → "Car Expenses"  
- User category: "Entertainment" + Transaction: "NETFLIX SUBSCRIPTION" → "Entertainment"
- User category: "Utilities" + Transaction: "ELECTRICITY BILL" → "Utilities"

**IMPORTANT**: The success of this system depends on accurately matching to user's preferred categories. Be smart about matching but never invent categories.`;
    } else {
      return `3. **Smart Categorization – Think Like a Human Expert**: Infer a plausible category for each transaction based on its description, drawing on domain knowledge of common transaction patterns. Consider typical keywords and contexts:
       - Fuel purchases (petrol pumps, gas stations) → "transport" (e.g., descriptions containing "Fuel" or "Petrol").
       - Restaurants, food delivery, groceries → "food" (e.g., "Zomato", "Swiggy", "Restaurant").
       - Shopping and e-commerce → "shopping" (e.g., "Amazon", "Flipkart", "Mall").
       - Utility bills (electricity, water, phone) → "utilities" (e.g., "Airtel", "Electricity Bill").
       - ATM withdrawals or cash transactions → "cash_withdrawal" (e.g., descriptions with "ATM WDL", "Cash").
       - Salary credits or pension → "salary" (e.g., "SALARY", "PAY").
       - Investment-related (mutual funds, stock buys/sells) → "investment" (e.g., "SIP", "MF").
       - Insurance payments (premiums, policy payments) → "insurance" (e.g., "LIC", "INSURANCE PREMIUM").
       - Bank transfers (NEFT, RTGS, IMPS) → "transfer" (e.g., "NEFT", "IMPS", "TRANSFER").
       - Interest credits from bank → "interest" (e.g., "INT. PAID", "INTEREST earned").
       - Bank fees or charges → "fees" (e.g., "CHARGES", "FEE", "PENALTY").
       - Medical or pharmacy expenses → "healthcare" (e.g., "Hospital", "Pharmacy").
       - If none of the above apply, use a general category like "others".
       
       **Use your judgment as a human expert would**, based on the full description context. Recognize patterns, decode banking abbreviations, understand merchant codes, and infer transaction purpose from contextual clues. If the description doesn't clearly indicate a specific category even with your expert analysis, use "others" rather than making an incorrect guess. It's better to be accurate than to mislead the user.`;
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
