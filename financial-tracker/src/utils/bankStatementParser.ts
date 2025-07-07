import { Transaction } from '@/types';
import { supabase } from '@/utils/supabase';
import { parserRegistry } from '@/utils/parserRegistry';

// Type definitions
interface BankTemplate {
  id: string;
  bank_name: string;
  format: 'PDF' | 'CSV';
  identifier: string;
  parser_module: string;
  parser_config: any;
  created_at: string;
  updated_at: string;
}

interface ParseResult {
  success: boolean;
  transactions: Transaction[];
  error?: string;
}

/**
 * Hybrid Bank Statement Parser Service
 * This service dynamically loads and executes bank-specific parsers
 * based on configuration stored in the database
 */
export class BankStatementParserService {
  private templateCache: Map<string, BankTemplate> = new Map();

  /**
   * Parse a bank statement file using the appropriate template
   * @param file - The file to parse
   * @param templateIdentifier - The identifier of the template to use
   * @returns Promise<ParseResult>
   */
  async parseStatement(file: File, templateIdentifier: string): Promise<ParseResult> {
    try {
      // Get the template configuration
      const template = await this.getTemplate(templateIdentifier);
      if (!template) {
        return {
          success: false,
          transactions: [],
          error: `Template not found: ${templateIdentifier}`
        };
      }

      // Validate file format matches template
      const fileFormat = this.getFileFormat(file);
      if (fileFormat !== template.format) {
        return {
          success: false,
          transactions: [],
          error: `File format ${fileFormat} does not match template format ${template.format}`
        };
      }

      // Load and execute the appropriate parser
      const transactions = await this.executeParser(file, template);
      
      return {
        success: true,
        transactions,
      };
    } catch (error) {
      console.error('Error parsing bank statement:', error);
      return {
        success: false,
        transactions: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get available templates for a specific bank and format
   * @param bankName - Optional bank name filter
   * @param format - Optional format filter
   * @returns Promise<BankTemplate[]>
   */
  async getAvailableTemplates(bankName?: string, format?: 'PDF' | 'CSV'): Promise<BankTemplate[]> {
    try {
      let query = supabase
        .from('bank_templates')
        .select('*')
        .order('bank_name', { ascending: true });

      if (bankName) {
        query = query.eq('bank_name', bankName);
      }

      if (format) {
        query = query.eq('format', format);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching templates:', error);
        return [];
      }

      return data as BankTemplate[];
    } catch (error) {
      console.error('Error fetching available templates:', error);
      return [];
    }
  }

  /**
   * Add a new bank template to the database
   * @param template - The template to add
   * @returns Promise<boolean>
   */
  async addTemplate(template: Omit<BankTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bank_templates')
        .insert([template]);

      if (error) {
        console.error('Error adding template:', error);
        return false;
      }

      // Clear cache to force reload
      this.templateCache.clear();
      return true;
    } catch (error) {
      console.error('Error adding template:', error);
      return false;
    }
  }

  /**
   * Update an existing bank template
   * @param identifier - The template identifier
   * @param updates - The updates to apply
   * @returns Promise<boolean>
   */
  async updateTemplate(identifier: string, updates: Partial<BankTemplate>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bank_templates')
        .update(updates)
        .eq('identifier', identifier);

      if (error) {
        console.error('Error updating template:', error);
        return false;
      }

      // Clear cache to force reload
      this.templateCache.delete(identifier);
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      return false;
    }
  }

  /**
   * Delete a bank template
   * @param identifier - The template identifier
   * @returns Promise<boolean>
   */
  async deleteTemplate(identifier: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bank_templates')
        .delete()
        .eq('identifier', identifier);

      if (error) {
        console.error('Error deleting template:', error);
        return false;
      }

      // Clear cache
      this.templateCache.delete(identifier);
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  /**
   * Get a template by identifier with caching
   * @param identifier - The template identifier
   * @returns Promise<BankTemplate | null>
   */
  private async getTemplate(identifier: string): Promise<BankTemplate | null> {
    // Check cache first
    if (this.templateCache.has(identifier)) {
      return this.templateCache.get(identifier)!;
    }

    try {
      const { data, error } = await supabase
        .from('bank_templates')
        .select('*')
        .eq('identifier', identifier)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        return null;
      }

      const template = data as BankTemplate;
      this.templateCache.set(identifier, template);
      return template;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Execute the appropriate parser for the given template
   * @param file - The file to parse
   * @param template - The template configuration
   * @returns Promise<Transaction[]>
   */
  private async executeParser(file: File, template: BankTemplate): Promise<Transaction[]> {
    try {
      // Use the parser registry to get the appropriate parser
      const parserFactory = await parserRegistry.getParserFactory(template.identifier);
      
      // Create parser instance with configuration
      const parser = parserFactory(template.parser_config);
      
      // Execute the parser
      return await parser.parse(file);
    } catch (error) {
      console.error('Error executing parser:', error);
      throw error;
    }
  }

  /**
   * Determine file format from file extension
   * @param file - The file to check
   * @returns 'PDF' | 'CSV' | 'UNKNOWN'
   */
  private getFileFormat(file: File): 'PDF' | 'CSV' | 'UNKNOWN' {
    const extension = file.name.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'csv':
        return 'CSV';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

// Export singleton instance
export const bankStatementParser = new BankStatementParserService();
