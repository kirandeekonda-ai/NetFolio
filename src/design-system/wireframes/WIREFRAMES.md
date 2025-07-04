# Financial Tracker App Wireframes

## Navigation System
- Responsive navigation bar using our design system components
- Mobile: Bottom navigation with icons
- Desktop: Side navigation with labels and icons

## Screen 1: File Upload

### Desktop Layout
```
+------------------------------------------+
|             Upload Statement              |
+------------------------------------------+
|                                          |
|   +--------------------------------+     |
|   |     Drag & Drop Zone           |     |
|   |     or                         |     |
|   |     Choose File                |     |
|   +--------------------------------+     |
|                                          |
|   Supported formats:                     |
|   - CSV                                  |
|   - Excel (.xlsx, .xls)                 |
|                                          |
|   [Preview Area]                         |
|   Shows first 5 rows of uploaded file    |
|                                          |
|   [Continue Button]                      |
+------------------------------------------+
```

### Mobile Layout
- Simplified drag & drop
- Full-width buttons
- Scrollable preview

### Components Used
- Card component for upload area
- Primary button for "Choose File"
- Table component for preview
- Label component for file format info

## Screen 2: Interactive Categorization

### Desktop Layout
```
+------------------------------------------+
|        Transaction Categorization         |
+------------------------------------------+
| Search: [________________] Filter [ ]     |
|                                          |
| [Table]                                  |
| Date | Description | Amount | Category    |
|------|-------------|---------|-----------|
| Row 1| Transaction | $XX.XX  | [Label]   |
| Row 2| Transaction | $XX.XX  | [Label]   |
|                                          |
| Categories:                              |
| [Food] [Transport] [Bills] [Shopping]    |
| [Entertainment] [Health] [Others]        |
+------------------------------------------+
```

### Mobile Layout
- Stacked card view for transactions
- Swipeable category assignment
- Bottom sheet for category selection

### Category Labels (Pre-defined)
1. Essential
   - Food & Groceries
   - Housing & Utilities
   - Transport
2. Lifestyle
   - Shopping
   - Entertainment
   - Health & Wellness
3. Financial
   - Income
   - Investments
   - Bills & Payments

## Screen 3: Dashboard

### Desktop Layout
```
+------------------------------------------+
|               Dashboard                   |
+------------------------------------------+
| Period: [This Month ▼]  Compare: [Last Month ▼] |
|                                          |
| [Card]         [Card]         [Card]     |
| Balance        Income         Expenses   |
| $XX,XXX        $X,XXX         $X,XXX    |
|                                          |
| [Visualization Area]                     |
| - Expense Breakdown (Pie Chart)          |
| - Income vs Expenses (Bar Chart)         |
| - Monthly Trend (Line Graph)             |
|                                          |
| [Customize Visualizations]               |
+------------------------------------------+
```

### Mobile Layout
- Scrollable cards for metrics
- Swipeable visualizations
- Collapsible time period selector

### Components Used
- Card components for metrics
- Interactive charts (using design system colors)
- Dropdown selectors for time periods
- Label components for categories

## Dummy Data Structure
```javascript
const dummyTransactions = [
  {
    date: "2025-07-01",
    description: "Grocery Store",
    amount: 85.50,
    category: "Food & Groceries"
  },
  {
    date: "2025-07-02",
    description: "Monthly Salary",
    amount: 5000.00,
    category: "Income"
  },
  // ... more transactions
];

const dummyMetrics = {
  balance: 12500.75,
  monthlyIncome: 5000.00,
  monthlyExpenses: 2150.25,
  netBalance: 2849.75
};
```

## Responsive Design Notes
- Breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px
- Mobile-first approach
- Touch-friendly interactions
- Simplified visualizations on smaller screens

## Color Usage
- Use primary color for main actions
- Use accent color for interactive elements
- Use neutral colors for backgrounds and text
- Category labels use a subtle variation of the primary color

## Typography Implementation
- Use heading size for screen titles
- Use subheading for section headers
- Use body text for general content
- Use table text for transaction details
- Use label size for category tags
