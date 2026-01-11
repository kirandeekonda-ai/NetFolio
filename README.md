# NetFolio - Private Personal Finance OS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Supabase-blue)](https://nextjs.org)

**NetFolio** is a self-hosted, privacy-first personal finance tracking application. It bridges the gap between manual spreadsheets and automated tracking apps ensuring you own your data.

> "Stop giving your bank credentials to third-party apps. Own your financial data."

![NetFolio Dashboard Preview](https://github.com/user-attachments/assets/placeholder-image)
*(Replace with actual screenshot link after uploading)*

## 🚀 Why NetFolio?

Most finance apps (Mint, INDmoney, Copilot) require you to share sensitive banking credentials or OAuth tokens. They store your transaction history on their servers, analyze it, and often sell insights to advertisers.

**NetFolio is different:**
- **Self-Hosted**: You deploy it to your own generic cloud (Vercel + Supabase).
- **Privacy-First**: Your data lives in *your* database. No one else has access.
- **Hybrid Tracking**:
  - **Live Markets**: Real-time stock/mutual fund tracking via public APIs.
  - **Bank Logic**: "Minimal Manual Effort" approach using statement parsing or simple verified manual entry.
  - **Bill Management**: Monthly payments tracker with recurring reminders.

## ✨ Features

- **📊 Portfolio Tracker**: Real-time tracking of Stocks, Mutual Funds, and ETFs.
  - Automatic XIRR & CAGR calculations.
  - Sector & Asset allocation analytics.
- **💰 Net Worth Dashboard**: Aggregated view of all assets (Bank Accounts, Investments, Manual Assets).
- **📝 Monthly Command Center**:
  - Track recurring bills & SIPs.
  - "Mark as Paid" checklist.
  - Visual status indicators (Paid, Due Soon, Overdue).
- **🔐 Privacy & Security**:
  - Row Level Security (RLS) enabled by default.
  - Balance Privacy Mode (Hide/Show values).
- **🤖 Private AI (Optional)**:
  - Bring Your Own Key (BYOK) architecture for Google Gemini / OpenAI.
  - Parse unstructured bank statements without data leaving your control.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (Pages Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Auth**: Supabase Auth
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + [ShadCn UI](https://ui.shadcn.com/)
- **Charts**: Recharts & Tremor

## ⚡ Getting Started

### Prerequisites
- A [GitHub](https://github.com) account.
- A [Supabase](https://supabase.com) account (Free Tier is sufficient).
- A [Vercel](https://vercel.com) account (Free Tier is sufficient).

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/NetFolio.git
cd netfolio
npm install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env.local
```
Fill in your keys from Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Setup (Supabase)
Run the migration scripts located in `supabase/migrations` via the Supabase SQL Editor.
(Or use the standard schema dumped in `scripts/schema.sql` if provided).

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
