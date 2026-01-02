import axios from 'axios';

class ClientMarketDataService {
    async search(query: string) {
        if (!query) return [];
        const res = await axios.get(`/api/finance/market-data`, {
            params: { action: 'search', query }
        });
        return res.data;
    }

    async getProfile(symbol: string) {
        const res = await axios.get(`/api/finance/market-data`, {
            params: { action: 'profile', symbol }
        });
        return res.data;
    }

    async getBatchQuotes(symbols: string[]) {
        if (symbols.length === 0) return {};
        const res = await axios.get(`/api/finance/market-data`, {
            params: { action: 'batch', symbols: symbols.join(',') }
        });
        return res.data;
    }
}

export const clientMarketData = new ClientMarketDataService();
