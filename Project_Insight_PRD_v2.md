
# Product Requirements Document: Project Insight

**Author:** Gemini  
**Version:** 2.0 (Manual-First Approach)  
**Date:** 2025-06-29

---

## 1. Overview & Vision

### 1.1. Vision
To create a hyper-personalized, privacy-first financial analysis tool that makes manual financial tracking elegant, fast, and insightful, empowering users to improve their net worth with the clarity of a financial expert.

### 1.2. Problem Statement
Individuals trying to track their finances manually often resort to cumbersome spreadsheets. This process is tedious, error-prone, and lacks the dynamic, insightful analysis needed to make informed financial decisions. Existing tools that could help are often overly complex, expensive, or raise privacy concerns by requiring users to share sensitive account credentials.

### 1.3. Goal
Project Insight will be a locally-run web application that provides a beautiful and efficient interface for manually tracking all financial data. It will serve as a central hub for assets, liabilities, and transactions, offering powerful, AI-driven analysis and visualizations to transform raw numbers into actionable insights—all while ensuring absolute user privacy.

### 1.4. Target Audience
The primary user is a detail-oriented, privacy-conscious individual who wants to actively manage their finances. They are willing to spend a few minutes a day/week entering data in exchange for a powerful, private, and customized view of their financial world.

---

## 2. Core Features & Functionality (Epics)

### Epic 1: The Financial Ledger - Manual Data Management

> *As a user, I want a simple and fast way to manually enter all my financial information so I have a complete and accurate dataset to analyze.*

**User Stories:**
*   **1.1. Account Setup:** The user can create and manage various financial accounts. Each account will have a name, a type (e.g., `Checking`, `Savings`, `Credit Card`, `Investment`, `Cash`), and an optional starting balance.
*   **1.2. Transaction Entry Form:** A streamlined, keyboard-friendly form allows the user to quickly add a new transaction. Fields will include: Date, Description (Payee), Amount, Transaction Type (`Expense` or `Income`), Category, and associated Account.
*   **1.3. Asset Entry:** The user can manually add, update, and remove non-liquid assets (e.g., `Real Estate`, `Vehicle`, `Art & Collectibles`). Required fields: Asset Name, Asset Type, and Current Market Value.
*   **1.4. Liability Entry:** The user can manually add, update, and remove liabilities (e.g., `Mortgage`, `Student Loan`, `Auto Loan`). Required fields: Liability Name, Liability Type, and Current Balance Owed.
*   **1.5. Transaction View:** A dedicated page displays a searchable and filterable table of all transactions. Users can edit or delete any transaction directly from this view.

### Epic 2: AI-Powered Insights & Dashboard

> *As a user, I want a clear, high-level dashboard that automatically analyzes my data so I can understand my financial health and discover trends at a glance.*

**User Stories:**
*   **2.1. Net Worth KPI:** The dashboard prominently displays the user's real-time Net Worth, calculated as `(Sum of all Account Balances + Sum of all Asset Values) - Sum of all Liability Balances`.
*   **2.2. Financial Health Metrics:** The dashboard shows key metrics for a selected time period (e.g., Last 30 Days, This Month, YTD):
    *   Total Income
    *   Total Expenses
    *   Net Cash Flow (Income - Expenses)
*   **2.3. Spending Analysis:** A visually appealing chart (e.g., Donut Chart or Treemap) provides a breakdown of expenses by category, allowing the user to see where their money is going.
*   **2.4. Net Worth & Cash Flow Trends:** A line chart visualizes the historical trend of the user's net worth and cash flow over time, providing a powerful view of their financial progress.
*   **2.5. Date Range Filter:** The user can filter the entire dashboard view by a specific date range (e.g., This Year, Last Quarter, Custom) to analyze specific periods.
*   **2.6. (AI Feature) Insight Cards:** The dashboard will feature a section for "Insights" - small, digestible cards that highlight important information, such as: "Your spending on `Restaurants` is up 25% this month," or "You've hit a new record for Net Worth!"

### Epic 3: Smart Categorization

> *As a user, I want to organize my transactions with a flexible category system so my financial analysis is meaningful and personalized.*

**User Stories:**
*   **3.1. Default Categories:** The system includes a default, hierarchical list of categories and sub-categories (e.g., `Home > Rent/Mortgage`, `Transport > Fuel`).
*   **3.2. Category Management:** The user has full control to add, edit, and delete categories and sub-categories to perfectly match their lifestyle.
*   **3.3. (AI Feature) Smart Suggestions:** As the user types a transaction description, the system suggests a category based on past entries (e.g., typing "Shell" will suggest the "Transport > Fuel" category).

---

## 3. Non-Functional Requirements

### 3.1. Security & Privacy
*   **Local First:** All user data MUST be stored on the user's local machine in a SQLite database file. No data will be transmitted to any external server.
*   **No Telemetry:** The application will not collect any usage data.

### 3.2. Usability & UX
*   **Speed of Entry:** The UI must be optimized for rapid, keyboard-driven data entry to minimize friction.
*   **Clean & Modern UI:** The interface will be intuitive and visually appealing, using modern design principles (e.g., Material Design).
*   **Minimal Setup:** The application will be easy to install and run locally.

### 3.3. Performance
*   **Instantaneous UI:** The dashboard and transaction views must load instantly and update in real-time as new data is entered.

---

## 4. Technology Stack (Proposed)

*   **Frontend:** React / Next.js with TypeScript
*   **UI Library:** Material-UI (MUI)
*   **Charting:** Recharts
*   **Backend:** Python / FastAPI
*   **Database:** SQLite

---

## 5. Out of Scope (For Version 1.0)

*   **Automated Statement Parsing (PDF/CSV):** This is the top priority for a future version, but is explicitly out of scope for the initial release.
*   Direct bank/broker API integration.
*   Multi-user support or user accounts.
*   Budgeting, forecasting, and goal-setting features.

---

## 6. Success Metrics

*   **Primary Metric:** A new user can set up their accounts and log their first 10 transactions (a mix of income and expenses) in under 5 minutes.
*   **Secondary Metric:** The dashboard accurately reflects the user's financial data in real-time, providing a correct Net Worth calculation.
*   **User Feedback:** Positive qualitative feedback on the ease of use, speed of data entry, and the quality of the financial insights provided.

