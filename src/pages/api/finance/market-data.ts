import type { NextApiRequest, NextApiResponse } from 'next';
import { marketDataService } from '@/lib/MarketDataServiceServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { action, query, symbol, symbols } = req.query;

    try {
        switch (action) {
            case 'search':
                if (typeof query !== 'string') throw new Error('Query missing');
                const results = await marketDataService.searchSymbols(query);
                res.status(200).json(results);
                break;

            case 'quote':
                if (typeof symbol !== 'string') throw new Error('Symbol missing');
                const quote = await marketDataService.getQuote(symbol);
                res.status(200).json(quote);
                break;

            case 'profile':
                if (typeof symbol !== 'string') throw new Error('Symbol missing');
                const profile = await marketDataService.getCompanyProfile(symbol);
                res.status(200).json(profile);
                break;

            case 'batch':
                // symbols can be comma separated string
                const symbolList = typeof symbols === 'string' ? symbols.split(',') : [];
                const prices = await marketDataService.getBatchQuotes(symbolList);
                res.status(200).json(prices);
                break;

            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
