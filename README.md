# NetFolio – Personal Finance Tracker

## Technology Stack

- **Framework:** Next.js (React)
- **Language:** TypeScript
- **State Management:** Redux Toolkit, React Redux
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **Data Parsing:** PapaParse (CSV), pdfjs-dist (PDF)
- **Forms:** React Hook Form
- **Charts:** Recharts
- **Testing:** Playwright (end-to-end)
- **Utilities:** Axios, React Dropzone

## Project Structure

- `src/pages/` – Next.js pages (routes)
- `src/components/` – Reusable React components
- `src/store/` – Redux slices and store setup
- `src/utils/` – Utility functions (currency, category colors, PDF loader, etc.)
- `e2e/` – Playwright end-to-end tests

## Key Features

- Upload Indian bank statements in PDF, CSV (Excel coming soon)
- Parse and extract transactions (date, amount, description)
- Categorize transactions with color-coded, user-friendly dropdown
- Modern, responsive UI with rupee formatting
- Dashboard with charts and summaries
- End-to-end tests with Playwright

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Run the development server:**
   ```sh
   npm run dev
   ```
3. **Run end-to-end tests:**
   ```sh
   npx playwright test
   ```

## Configuration
- **TypeScript:** See `tsconfig.json`
- **Tailwind CSS:** See `tailwind.config.ts`
- **Playwright:** See `playwright.config.ts`

## License
MIT
