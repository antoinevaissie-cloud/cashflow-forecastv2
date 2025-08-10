# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cashflow forecasting web application built with Next.js 15 and Prisma. It helps manage personal finances by tracking accounts receivable (money owed to you), accounts payable (money you owe), monthly bank balances across multiple accounts, and generating cashflow forecasts with variance analysis.

## Technology Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS v4
- **Validation**: Zod
- **Date Handling**: date-fns
- **Testing/Screenshots**: Playwright

## Development Commands

### Core Development
```bash
npm run dev              # Start dev server with Turbopack
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint checking
```

### Database Operations
```bash
npm run db:push          # Push Prisma schema to database
npm run prisma:generate  # Generate Prisma client types
npm run prisma:studio    # Open database GUI
npm run prisma           # Access Prisma CLI directly
```

### Screenshot Testing
```bash
npm run screenshots:start  # Crawl and screenshot all pages
npm run screenshots:crawl  # Custom screenshot crawling
```

## Architecture Overview

### Database Schema Design
The application uses a **cents-based monetary storage pattern** to avoid floating-point errors:
- All amounts stored as integers in cents (e.g., €100.50 = 10050 cents)
- Multi-currency support with conversion utilities (EUR/GBP)
- Generated Prisma client located in `src/generated/prisma/` (ignored by ESLint)

### Data Flow Pattern
This app uses **Next.js Server Actions** instead of traditional API routes:
1. **Server Components** query database directly via Prisma
2. **Server Actions** handle form submissions and mutations
3. **revalidatePath()** refreshes cached data after mutations
4. No `/api` directory - all backend logic in page components

### Key Application Flow
```
User Form → Server Action → Prisma → SQLite → revalidatePath() → UI Update
```

### Core Data Models
- **AccountsReceivable**: Invoices/payments expected from others
- **AccountsPayable**: Bills/payments you need to make  
- **Balance**: Monthly snapshots of bank account balances

### Forecast Algorithm
Located in `src/app/forecast/page.tsx:31-89`, the forecast engine:
1. Takes latest balance as opening position
2. Projects forward N months using unpaid receivables/payables
3. Compares actual vs forecast with variance highlighting
4. Uses rolling calculations for multi-month projections

## Code Organization

### Financial Utilities (`src/lib/money.ts`)
- `eurosToCents()` / `poundsToCents()` - Convert decimals to cents
- `centsToCurrencyString()` - Format for display with Intl.NumberFormat
- `convertToEurCents()` - Multi-currency conversion with environment rate
- GBP-EUR conversion rate via `GBP_EUR_RATE` environment variable

### Database Layer (`src/lib/prisma.ts`)
- Singleton pattern for Prisma client
- Development-only global instance to prevent connection exhaustion
- Generated types output to `src/generated/prisma/`

### Page Structure
- **List Pages**: Server components with direct database queries
- **Form Pages**: Server actions for CRUD operations with immediate redirects
- **Forecast Page**: Complex server-side calculation with URL params for filtering

## Important Configuration

### Path Aliases
- `@/*` maps to `src/*` for clean imports

### ESLint Configuration
- Ignores generated Prisma files in `src/generated/**`
- Extends Next.js core rules with TypeScript support

### Database Environment
- SQLite database file: `prisma/dev.db` 
- Connection string: `DATABASE_URL=file:./dev.db`

## Development Patterns

### Server Action Pattern
```typescript
async function actionName(formData: FormData) {
  "use server";
  // Extract and validate form data
  // Database operation via Prisma
  // Redirect or revalidate
}
```

### Form Handling
Forms use native HTML `action` attribute pointing to server functions, not `onSubmit` handlers.

### Currency Display
Always use `centsToCurrencyString()` for user-facing amounts to ensure proper formatting and currency symbols.

### Date Handling
Forecast calculations use first-day-of-month normalization for consistent monthly grouping.

## Screenshot Tooling

The `tools/screenshot-crawl.ts` script uses Playwright to automatically screenshot all application pages for visual regression testing. Configure via environment variables:
- `START_URL` - Base URL to crawl
- `OUT_DIR` - Screenshot output directory  
- `MAX_PAGES` - Maximum pages to capture
- `CONCURRENCY` - Parallel browser instances