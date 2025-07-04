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

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
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
