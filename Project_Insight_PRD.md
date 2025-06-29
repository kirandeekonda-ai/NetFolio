
# Product Requirements Document: Project Insight

**Author:** Gemini  
**Version:** 1.0  
**Date:** 2025-06-29

---

## 1. Overview & Vision

### 1.1. Vision
To create a hyper-personalized, privacy-first financial analysis tool that empowers users to understand and improve their net worth with the clarity of a financial expert.

### 1.2. Problem Statement
Individuals with multiple bank accounts, credit cards, and investments struggle to get a unified, high-level view of their financial health. Manually tracking transactions is tedious and error-prone. Commercial tools exist, but they often require sharing sensitive login credentials, creating privacy concerns. Furthermore, these tools lack the customizability to cater to specific user needs and often come with subscription fees.

### 1.3. Goal
Project Insight will be a locally-run web application that automates financial tracking by intelligently parsing uploaded bank and credit card statements. It will provide AI-driven categorization and insightful analysis, offering a secure, private, and bespoke alternative to commercial financial aggregators.

### 1.4. Target Audience
The primary user is a tech-savvy individual who is privacy-conscious and wants deep, data-driven insights into their personal finances without paying for a subscription or sharing credentials with a third party.

---

## 2. Core Features & Functionality (Epics)

This PRD is broken down into major user-facing features, or "Epics." Each Epic contains specific, actionable user stories.

### Epic 1: Core Data Ingestion & Processing Engine

> *As a user, I want to upload my financial statements so the system can automatically extract and process my transactions.*

**User Stories:**
*   **1.1. Secure File Upload:** The user can select and upload one or more financial statements (PDF or CSV format) through a simple web interface. The upload process must be handled locally without sending the file to an external server.
*   **1.2. Statement Parser:** The system can parse PDF statements from a pre-defined list of financial institutions. The parser must accurately extract transaction date, description, amount, and transaction type (debit/credit).
    *   *Technical Note: We will start with one specific bank's format and build a modular system to add more parsers later.*
*   **1.3. CSV Parser:** The system can parse a standardized CSV format that users can export from their banks. The user will be able to map columns (e.g., "Date", "Description", "Amount") during the first import.
*   **1.4. Transaction Standardization:** The system cleans and standardizes extracted transaction data into a consistent format (e.g., uniform date format, consistent case for descriptions).
*   **1.5. Data Storage:** All processed transactions are securely stored in a local SQLite database, linked to the source statement and account.

### Epic 2: AI-Powered Transaction Categorization

> *As a user, I want the system to automatically categorize my transactions so I can understand my spending habits without manual effort.*

**User Stories:**
*   **2.1. Default Categories:** The system includes a default, hierarchical list of categories and sub-categories (e.g., `Food & Dining > Groceries`, `Food & Dining > Restaurants`, `Transport > Ride Sharing`).
*   **2.2. Rule-Based Categorization Engine:** The system uses a configurable rules engine to categorize transactions based on keywords in the description (e.g., if description contains "AMAZON", categorize as "Shopping").
*   **2.3. Manual Override:** The user can easily change the category of any transaction. The system should offer to create a new rule based on this change (e.g., "Always categorize 'LOCAL COFFEE SHOP' as 'Food & Dining > Coffee'").
*   **2.4. Category Management:** The user can add, edit, and delete categories and sub-categories to create a personalized system.
*   **2.5. (Future) ML Categorization:** The system will eventually learn from the user's manual corrections to build a predictive model for categorizing new, unseen transactions.

### Epic 3: The Dashboard - Your Financial Cockpit

> *As a user, I want a clear, high-level dashboard so I can see my overall financial health at a glance.*

**User Stories:**
*   **3.1. Net Worth Display:** The dashboard prominently displays the user's current Net Worth. This will initially be calculated as `(Assets - Liabilities)` based on the data available.
*   **3.2. Key Performance Indicators (KPIs):** The dashboard shows key metrics for a selected time period (e.g., Last 30 Days, This Month):
    *   Total Income
    *   Total Expenses
    *   Savings Rate (Income - Expenses) / Income
*   **3.3. Spending by Category:** A visually appealing chart (e.g., Donut Chart or Bar Chart) shows a breakdown of expenses by category for the selected period.
*   **3.4. Net Worth Over Time:** A line chart visualizes the historical trend of the user's net worth based on the uploaded statement data.
*   **3.5. Date Range Filter:** The user can filter the entire dashboard view by a specific date range (e.g., This Year, Last Quarter, Custom).

### Epic 4: Asset & Liability Management

> *As a user, I want to define my assets and liabilities to get an accurate calculation of my net worth.*

**User Stories:**
*   **4.1. Manual Asset Entry:** The user can manually add and track assets that don't appear on statements, such as property, vehicles, or high-value collectibles. Required fields: Asset Name, Asset Type, Current Value.
*   **4.2. Manual Liability Entry:** The user can manually add and track loans (mortgage, auto, student) or other debts. Required fields: Liability Name, Liability Type, Current Balance.
*   **4.3. Account Linking:** Transactions from uploaded statements will be linked to specific accounts (e.g., "Chase Sapphire Credit Card," "Citibank Savings"). The system should automatically update the balance of these accounts based on new transactions.

---

## 3. Non-Functional Requirements

### 3.1. Security & Privacy
*   **Local First:** All user data, including uploaded statements and the resulting database, MUST be stored on the user's local machine. No data should be transmitted to any external server.
*   **No Telemetry:** The application will not collect any usage data or telemetry.

### 3.2. Usability & UX
*   **Clean & Modern UI:** The interface should be intuitive, clean, and visually appealing, using modern design principles (e.g., Material Design).
*   **Responsive Design:** The application should be usable on standard desktop screen sizes.
*   **Minimal Setup:** The application should be easy to install and run, ideally as a single executable or a simple `docker-compose up` command.

### 3.3. Performance
*   **Fast Parsing:** Statement parsing for a single file should complete within a few seconds.
*   **Responsive UI:** The dashboard and transaction views should load instantly, even with tens of thousands of transactions.

### 3.4. Extensibility
*   **Modular Parser Architecture:** The system for parsing statements must be designed in a modular way, making it straightforward to add new parsers for different banks in the future.

---

## 4. Technology Stack (Proposed)

*   **Frontend:** React / Next.js with TypeScript
*   **UI Library:** Material-UI (MUI)
*   **Charting:** Recharts
*   **Backend:** Python / FastAPI
*   **Database:** SQLite
*   **PDF Parsing:** `pdfplumber` or `PyMuPDF`

---

## 5. Out of Scope (For Version 1.0)

*   Direct bank/broker API integration.
*   Multi-user support or user accounts.
*   Cloud hosting or synchronization.
*   Investment performance analysis (e.g., IRR, time-weighted returns).
*   Budgeting and goal-setting features.
*   Mobile application (iOS/Android).

---

## 6. Success Metrics

*   **Primary Metric:** User can successfully upload a statement from a supported institution, see all transactions extracted, and view an updated dashboard reflecting the new data.
*   **Secondary Metric:** The categorization engine achieves >80% accuracy on common transactions after initial rule setup.
*   **User Feedback:** Positive qualitative feedback on the privacy, usability, and insights provided by the tool.

