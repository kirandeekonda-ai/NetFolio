export interface InvestmentHolding {
  id: string;
  user_id: string;
  holder_name: string; // 'Kiran' | 'Anusha'
  ticker_symbol: string;
  name: string;
  asset_class: 'Equity' | 'Mutual Fund' | 'ETF' | 'Debt Fund' | 'Gold' | 'Crypto' | 'Other';
  sector?: string;
  strategy_bucket?: string; // e.g. 'Long Term', 'Swing', 'Opportunity'
  avg_price: number;
  quantity: number;
  investment_date: string; // ISO date string
  current_price?: number;
  previous_close?: number; // Previous day's closing price for day P&L calculation
  last_price_update?: string;

  // Computed fields for UI
  invested_amount?: number;
  current_value?: number;
  pnl_amount?: number;
  pnl_percentage?: number;
  days_held?: number;
  day_change_amount?: number;
  day_change_percentage?: number;
  xirr?: number;
  cagr?: number;
  transactions?: InvestmentTransaction[];
}

export interface InvestmentTransaction {
  id: string;
  holding_id: string;
  user_id: string;
  type: 'buy' | 'sell' | 'dividend';
  date: string;
  quantity: number;
  price_per_unit: number;
  fees?: number;
  notes?: string;
  created_at: string;
}

export interface FinancePortfolioMetrics {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percentage: number;
  day_change_amount: number;
  day_change_percentage: number;
}

export interface FinanceDashboardData {
  holdings: InvestmentHolding[];
  metrics: FinancePortfolioMetrics;
  sector_allocation: { name: string; value: number }[];
  holder_allocation: { name: string; value: number }[];
}
