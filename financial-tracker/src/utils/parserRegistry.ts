import { Transaction } from '@/types';

// Parser registry to handle dynamic imports
interface ParserInstance {
  parse(file: File): Promise<Transaction[]>;
}

interface ParserFactory {
  (config: any): ParserInstance;
}

// Registry of all available parsers
const PARSER_REGISTRY: Record<string, () => Promise<ParserFactory>> = {
  'dbs_pdf_v1': async () => {
    const { createDbsPdfParser } = await import('@/templates/dbs_pdf_v1');
    return createDbsPdfParser;
  },
  // Add more parsers here as they are implemented
  // 'chase_pdf_v1': async () => {
  //   const { createChasePdfParser } = await import('@/templates/chase_pdf_v1');
  //   return createChasePdfParser;
  // },
};

/**
 * Parser Registry Service
 * Manages dynamic loading of parser modules
 */
export class ParserRegistry {
  private static instance: ParserRegistry;
  private factoryCache: Map<string, ParserFactory> = new Map();

  private constructor() {}

  static getInstance(): ParserRegistry {
    if (!ParserRegistry.instance) {
      ParserRegistry.instance = new ParserRegistry();
    }
    return ParserRegistry.instance;
  }

  /**
   * Get a parser factory for the given identifier
   * @param identifier - The parser identifier
   * @returns Promise<ParserFactory>
   */
  async getParserFactory(identifier: string): Promise<ParserFactory> {
    // Check cache first
    if (this.factoryCache.has(identifier)) {
      return this.factoryCache.get(identifier)!;
    }

    // Check if parser is registered
    if (!PARSER_REGISTRY[identifier]) {
      throw new Error(`Parser not found: ${identifier}. Available parsers: ${Object.keys(PARSER_REGISTRY).join(', ')}`);
    }

    try {
      // Load the parser factory
      const factory = await PARSER_REGISTRY[identifier]();
      
      // Cache the factory
      this.factoryCache.set(identifier, factory);
      
      return factory;
    } catch (error) {
      console.error(`Error loading parser ${identifier}:`, error);
      throw new Error(`Failed to load parser: ${identifier}`);
    }
  }

  /**
   * Get list of available parser identifiers
   * @returns string[]
   */
  getAvailableParsers(): string[] {
    return Object.keys(PARSER_REGISTRY);
  }

  /**
   * Check if a parser is available
   * @param identifier - The parser identifier
   * @returns boolean
   */
  isParserAvailable(identifier: string): boolean {
    return identifier in PARSER_REGISTRY;
  }

  /**
   * Clear the parser cache
   */
  clearCache(): void {
    this.factoryCache.clear();
  }
}

// Export singleton instance
export const parserRegistry = ParserRegistry.getInstance();
