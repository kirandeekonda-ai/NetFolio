import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

// Types for our internal usage
export interface MarketSearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string; // 'Equity', 'ETF', 'Mutual Fund'
}

export interface MarketQuote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    sector?: string;
    marketCap?: number;
    previousClose?: number;
}

class MarketDataService {
    // Simple in-memory cache to avoid hitting rate limits too hard during dev
    private cache: Map<string, { data: MarketQuote; timestamp: number }> = new Map();
    private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Search for symbols (Stocks, MFs, ETFs)
     * Prioritizes Indian markets (.NS, .BO)
     */
    async searchSymbols(query: string): Promise<MarketSearchResult[]> {
        try {
            if (!query || query.length < 2) return [];

            const results = await yahooFinance.search(query, {
                newsCount: 0,
                quotesCount: 20
            });

            return results.quotes
                .filter((q: any) => q.isYahooFinance) // Filter out news items
                .map((q: any) => ({
                    symbol: q.symbol,
                    name: q.longname || q.shortname || q.symbol,
                    exchange: q.exchange,
                    type: q.quoteType
                }));
        } catch (error) {
            console.error('MarketDataService: Search failed', error);
            return [];
        }
    }

    /**
     * Fetch live quote and metadata for a single symbol
     */
    async getQuote(symbol: string): Promise<MarketQuote | null> {
        try {
            // Check cache
            const cached = this.cache.get(symbol);
            if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
                return cached.data;
            }

            // Fetch from Yahoo Finance
            // We fetch 'quote' for price and 'quoteSummary' for sector/profile if possible
            // standard quote() often has what we need for price
            const quote = await yahooFinance.quote(symbol);

            // For Sector, we might need a separate call (quoteSummary) but regular quote often has partial info.
            // Let's try to get sector from quoteSummary if quote doesn't have it.
            let sector = undefined;

            // Optimization: Only fetch summary if we are "adding" the stock (first time), 
            // but here we just fetching price. Let's do a lightweight check.
            // NOTE: yahoo-finance2 quote() returns a rich object.

            const marketQuote: MarketQuote = {
                symbol: quote.symbol,
                price: quote.regularMarketPrice || 0,
                change: quote.regularMarketChange || 0,
                changePercent: quote.regularMarketChangePercent || 0,
                currency: quote.currency || 'INR',
                previousClose: quote.regularMarketPreviousClose,
                // sector: quote.sector // quote() typically doesn't have sector, need summary
            };

            this.cache.set(symbol, { data: marketQuote, timestamp: Date.now() });
            return marketQuote;
        } catch (error) {
            console.error(`MarketDataService: Quote failed for ${symbol}`, error);
            return null;
        }
    }

    /**
     * Fetch detailed profile (Sector, Industry) - Useful when Adding Investment
     */
    async getCompanyProfile(symbol: string) {
        try {
            const summary = await yahooFinance.quoteSummary(symbol, { modules: ['assetProfile', 'price'] });
            return {
                sector: summary.assetProfile?.sector,
                industry: summary.assetProfile?.industry,
                description: summary.assetProfile?.longBusinessSummary,
                price: summary.price?.regularMarketPrice,
                currency: summary.price?.currency
            };
        } catch (error) {
            console.error(`MarketDataService: Profile failed for ${symbol}`, error);
            return null;
        }
    }

    /**
     * Batch fetch prices for portfolio 
     * (Yahoo Finance supports passing array)
     */
    async getBatchQuotes(symbols: string[]): Promise<Record<string, number>> {
        if (symbols.length === 0) return {};

        try {
            const quotes = await yahooFinance.quote(symbols);
            const priceMap: Record<string, number> = {};

            if (Array.isArray(quotes)) {
                quotes.forEach(q => {
                    if (q.regularMarketPrice) {
                        priceMap[q.symbol] = q.regularMarketPrice;
                    }
                });
            } else {
                // Single result
                if (quotes.regularMarketPrice) {
                    priceMap[quotes.symbol] = quotes.regularMarketPrice;
                }
            }

            return priceMap;
        } catch (error) {
            console.error('MarketDataService: Batch quote failed', error);
            return {};
        }
    }
}

// Since yahoo-finance2 runs server-side (Node.js), we need to expose this via Next.js API Routes.
// We cannot verify this class directly in the browser.
export const marketDataService = new MarketDataService();
