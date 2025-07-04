// Dummy data for Financial Tracker App
export const dummyData = {
  transactions: [
    {
      id: "t1",
      date: "2025-07-01",
      description: "Grocery Store",
      amount: 85.50,
      category: "Food & Groceries",
      type: "expense"
    },
    {
      id: "t2",
      description: "Monthly Salary",
      date: "2025-07-02",
      amount: 5000.00,
      category: "Income",
      type: "income"
    },
    {
      id: "t3",
      date: "2025-07-03",
      description: "Netflix Subscription",
      amount: 15.99,
      category: "Entertainment",
      type: "expense"
    },
    {
      id: "t4",
      date: "2025-07-03",
      description: "Electric Bill",
      amount: 125.00,
      category: "Housing & Utilities",
      type: "expense"
    },
    {
      id: "t5",
      date: "2025-07-04",
      description: "Freelance Payment",
      amount: 750.00,
      category: "Income",
      type: "income"
    }
  ],
  
  categories: {
    essential: [
      "Food & Groceries",
      "Housing & Utilities",
      "Transport"
    ],
    lifestyle: [
      "Shopping",
      "Entertainment",
      "Health & Wellness"
    ],
    financial: [
      "Income",
      "Investments",
      "Bills & Payments"
    ]
  },
  
  metrics: {
    currentMonth: {
      balance: 12500.75,
      income: 5750.00,
      expenses: 2150.25,
      netBalance: 3599.75
    },
    previousMonth: {
      balance: 11250.50,
      income: 5000.00,
      expenses: 1850.75,
      netBalance: 3149.25
    }
  },
  
  visualizations: {
    default: ["expenseBreakdown", "incomeVsExpenses", "monthlyTrend"],
    available: [
      "expenseBreakdown",
      "incomeVsExpenses",
      "monthlyTrend",
      "categoryComparison",
      "savingsGoal",
      "budgetProgress"
    ]
  }
};
