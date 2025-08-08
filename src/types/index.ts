export interface Colors {
  primary: string;
  accent: string;
  neutral: {
    white: string;
    lightGray: string;
    darkCharcoal: string;
  };
}

export interface Typography {
  fonts: {
    primary: string;
    secondary: string;
  };
  sizes: {
    heading: string;
    subheading: string;
    body: string;
    tableText: string;
    labelButton: string;
  };
  weights: {
    regular: number;
    medium: number;
    semiBold: number;
    bold: number;
  };
}

export interface Components {
  button: {
    borderRadius: string;
    padding: string;
    hoverOpacity: number;
  };
  input: {
    borderRadius: string;
    padding: string;
    border: string;
    focusBorderColor: string;
  };
  table: {
    headerBackground: string;
    rowAlternateBackground: string;
    rowHoverBackground: string;
  };
  card: {
    borderRadius: string;
    padding: string;
    boxShadow: string;
  };
  label: {
    borderRadius: string;
    padding: string;
  };
}

// Bank Account Types
export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment';
  account_number_last4?: string;
  account_nickname?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Statement-based balance fields (added by services)
  current_balance?: number;
  statement_balance_available?: boolean;
}

export interface BankStatement {
  id: string;
  user_id: string;
  bank_account_id: string;
  statement_month: number;
  statement_year: number;
  statement_start_date: string;
  statement_end_date: string;
  transaction_count: number;
  total_credits: number;
  total_debits: number;
  file_name?: string;
  file_size_mb?: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  uploaded_at: string;
  processed_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  bank_account_id?: string;
  bank_statement_id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'income' | 'expense' | 'transfer';
  category_id?: string;
  category_name?: string;
  is_transfer: boolean;
  transfer_account_id?: string;
  // New transaction linking fields
  linked_transaction_id?: string;
  transfer_pair_id?: string;
  is_internal_transfer: boolean;
  transfer_detection_confidence?: number;
  transfer_notes?: string;
  reference_number?: string;
  balance_after?: number;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  date: string;
  type: 'income' | 'expense';
  category: string;
}

// Transfer-related interfaces
export interface TransferSuggestion {
  transaction1: Transaction;
  transaction2: Transaction;
  confidence: number;
  amountDiff: number;
  dateDiff: number;
  reason: string;
}

export interface TransferPair {
  transferPairId: string;
  transaction1: Transaction;
  transaction2: Transaction;
  confidence?: number;
  notes?: string;
  createdAt: string;
}

export interface TransferLinkRequest {
  transaction1Id: string;
  transaction2Id: string;
  confidence?: number;
  notes?: string;
}

export interface AccountSummary {
  id: string;
  user_id: string;
  bank_name: string;
  account_type: string;
  account_nickname?: string;
  currency: string;
  is_active: boolean;
  statement_count: number;
  latest_statement_period?: number;
  last_upload?: string;
}

export interface StatementCompletion {
  account_id: string;
  user_id: string;
  bank_name: string;
  account_nickname?: string;
  year: number;
  month: number;
  has_statement: boolean;
  processing_status?: string;
  uploaded_at?: string;
}

// Form Types for Creating/Updating
export interface BankAccountCreate {
  bank_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment';
  account_number_last4?: string;
  account_nickname?: string;
  currency?: string;
}

export interface BankAccountUpdate {
  bank_name?: string;
  account_type?: 'checking' | 'savings' | 'credit' | 'investment';
  account_number_last4?: string;
  account_nickname?: string;
  currency?: string;
  is_active?: boolean;
}

export interface StatementUpload {
  bank_account_id: string;
  statement_month: number;
  statement_year: number;
  statement_start_date: string;
  statement_end_date: string;
  file: File;
  extractedTransactions?: Transaction[];
  pageResults?: PageProcessingResult[];
}

export interface PageProcessingResult {
  pageNumber: number;
  totalPages: number;
  transactions: Transaction[];
  balance_data?: {
    opening_balance: number | null;
    closing_balance: number | null;
    available_balance: number | null;
    current_balance: number | null;
    balance_confidence: number;
    balance_extraction_notes: string;
  } | null;
  pageEndingBalance: number;
  processingNotes: string;
  hasIncompleteTransactions: boolean;
  success: boolean;
  error?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'essential' | 'lifestyle' | 'financial';
  color?: string;
}

export interface DashboardMetrics {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netBalance: number;
}

export interface ChartData {
  label: string;
  value: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserSettings {
  userId: string;
  defaultCurrency: string;
  categoryColors: Record<string, string>;
}
