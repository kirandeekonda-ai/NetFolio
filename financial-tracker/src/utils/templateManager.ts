import { bankStatementParser } from '@/utils/bankStatementParser';

/**
 * Template Management Utilities
 * Provides helper functions for managing bank statement templates
 */

interface TemplateConfig {
  bankName: string;
  format: 'PDF' | 'CSV';
  identifier: string;
  parserModule: string;
  parserConfig: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Template Manager class for administrative operations
 */
export class TemplateManager {
  /**
   * Validate a template configuration
   * @param config - The template configuration to validate
   * @returns ValidationResult
   */
  static validateTemplate(config: TemplateConfig): ValidationResult {
    const errors: string[] = [];

    // Required fields validation
    if (!config.bankName || config.bankName.trim() === '') {
      errors.push('Bank name is required');
    }

    if (!config.format || !['PDF', 'CSV'].includes(config.format)) {
      errors.push('Format must be either PDF or CSV');
    }

    if (!config.identifier || config.identifier.trim() === '') {
      errors.push('Identifier is required');
    }

    if (!config.parserModule || config.parserModule.trim() === '') {
      errors.push('Parser module is required');
    }

    if (!config.parserConfig || typeof config.parserConfig !== 'object') {
      errors.push('Parser config must be a valid object');
    }

    // Identifier format validation
    if (config.identifier && !/^[a-z0-9_]+$/.test(config.identifier)) {
      errors.push('Identifier must contain only lowercase letters, numbers, and underscores');
    }

    // Parser module validation
    if (config.parserModule && !config.parserModule.endsWith('.ts')) {
      errors.push('Parser module must end with .ts');
    }

    // Format-specific validation
    if (config.format === 'PDF' && config.parserConfig) {
      const pdfErrors = this.validatePdfConfig(config.parserConfig);
      errors.push(...pdfErrors);
    }

    if (config.format === 'CSV' && config.parserConfig) {
      const csvErrors = this.validateCsvConfig(config.parserConfig);
      errors.push(...csvErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate PDF parser configuration
   * @param config - The PDF parser configuration
   * @returns string[] - Array of validation errors
   */
  private static validatePdfConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.type || config.type !== 'table_based') {
      errors.push('PDF config must have type "table_based"');
    }

    if (!config.headers || !Array.isArray(config.headers) || config.headers.length === 0) {
      errors.push('PDF config must have a non-empty headers array');
    }

    if (!config.dateColumn || typeof config.dateColumn !== 'string') {
      errors.push('PDF config must have a dateColumn string');
    }

    if (!config.amountColumns || typeof config.amountColumns !== 'object') {
      errors.push('PDF config must have an amountColumns object');
    } else {
      if (!config.amountColumns.debit || !config.amountColumns.credit) {
        errors.push('PDF config amountColumns must have debit and credit properties');
      }
    }

    if (!config.descriptionColumns || !Array.isArray(config.descriptionColumns)) {
      errors.push('PDF config must have a descriptionColumns array');
    }

    if (typeof config.columnTolerance !== 'number' || config.columnTolerance < 0) {
      errors.push('PDF config columnTolerance must be a non-negative number');
    }

    if (typeof config.rowTolerance !== 'number' || config.rowTolerance < 0) {
      errors.push('PDF config rowTolerance must be a non-negative number');
    }

    return errors;
  }

  /**
   * Validate CSV parser configuration
   * @param config - The CSV parser configuration
   * @returns string[] - Array of validation errors
   */
  private static validateCsvConfig(config: any): string[] {
    const errors: string[] = [];

    // Add CSV-specific validation rules here
    if (!config.columns || typeof config.columns !== 'object') {
      errors.push('CSV config must have a columns mapping object');
    }

    return errors;
  }

  /**
   * Create a new template
   * @param config - The template configuration
   * @returns Promise<{ success: boolean, errors?: string[] }>
   */
  static async createTemplate(config: TemplateConfig): Promise<{ success: boolean, errors?: string[] }> {
    // Validate configuration
    const validation = this.validateTemplate(config);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // Create template
    const success = await bankStatementParser.addTemplate({
      bank_name: config.bankName,
      format: config.format,
      identifier: config.identifier,
      parser_module: config.parserModule,
      parser_config: config.parserConfig
    });

    return { success };
  }

  /**
   * Get template configuration examples
   * @returns Object with example configurations
   */
  static getExampleConfigs() {
    return {
      pdf: {
        bankName: 'Example Bank',
        format: 'PDF' as const,
        identifier: 'example_bank_pdf_v1',
        parserModule: 'example_bank_pdf_v1.ts',
        parserConfig: {
          type: 'table_based',
          headers: [
            'Date',
            'Description',
            'Debit',
            'Credit',
            'Balance'
          ],
          dateColumn: 'Date',
          dateFormat: 'MM/DD/YYYY',
          amountColumns: {
            debit: 'Debit',
            credit: 'Credit'
          },
          descriptionColumns: ['Description'],
          columnTolerance: 10,
          rowTolerance: 5,
          datePattern: '(\\d{2}/\\d{2}/\\d{4})',
          amountCleanPattern: '[^\\d.-]',
          skipHeaderLines: 1,
          multiLineDescription: false
        }
      },
      csv: {
        bankName: 'Example Bank',
        format: 'CSV' as const,
        identifier: 'example_bank_csv_v1',
        parserModule: 'example_bank_csv_v1.ts',
        parserConfig: {
          type: 'column_based',
          columns: {
            date: 0,
            description: 1,
            amount: 2,
            type: 3
          },
          dateFormat: 'MM/DD/YYYY',
          hasHeader: true,
          skipLines: 0,
          delimiter: ',',
          textQualifier: '"'
        }
      }
    };
  }

  /**
   * Export template for backup or sharing
   * @param identifier - The template identifier
   * @returns Promise<TemplateConfig | null>
   */
  static async exportTemplate(identifier: string): Promise<TemplateConfig | null> {
    const templates = await bankStatementParser.getAvailableTemplates();
    const template = templates.find(t => t.identifier === identifier);
    
    if (!template) {
      return null;
    }

    return {
      bankName: template.bank_name,
      format: template.format,
      identifier: template.identifier,
      parserModule: template.parser_module,
      parserConfig: template.parser_config
    };
  }

  /**
   * Import template from configuration
   * @param config - The template configuration to import
   * @returns Promise<{ success: boolean, errors?: string[] }>
   */
  static async importTemplate(config: TemplateConfig): Promise<{ success: boolean, errors?: string[] }> {
    return this.createTemplate(config);
  }

  /**
   * List all available templates with summary information
   * @returns Promise<Array<{ identifier: string, bankName: string, format: string, createdAt: string }>>
   */
  static async listTemplates(): Promise<Array<{ identifier: string, bankName: string, format: string, createdAt: string }>> {
    const templates = await bankStatementParser.getAvailableTemplates();
    return templates.map(template => ({
      identifier: template.identifier,
      bankName: template.bank_name,
      format: template.format,
      createdAt: template.created_at
    }));
  }

  /**
   * Test a template with a sample file
   * @param identifier - The template identifier
   * @param file - The sample file to test
   * @returns Promise<{ success: boolean, transactionCount: number, errors?: string[] }>
   */
  static async testTemplate(identifier: string, file: File): Promise<{ success: boolean, transactionCount: number, errors?: string[] }> {
    try {
      const result = await bankStatementParser.parseStatement(file, identifier);
      return {
        success: result.success,
        transactionCount: result.transactions.length,
        errors: result.error ? [result.error] : undefined
      };
    } catch (error) {
      return {
        success: false,
        transactionCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

// Export common template utilities
export const templateUtils = {
  validate: TemplateManager.validateTemplate,
  create: TemplateManager.createTemplate,
  examples: TemplateManager.getExampleConfigs,
  export: TemplateManager.exportTemplate,
  import: TemplateManager.importTemplate,
  list: TemplateManager.listTemplates,
  test: TemplateManager.testTemplate
};
