import { prismaClient } from "@/lib/prisma";
import { centsToCurrencyString, convertToEurCents } from "@/lib/money";

type Row = {
  period: string;
  openingCents: number;
  expectedInflowsCents: number;
  expectedOutflowsCents: number;
  budgetInflowsCents: number;
  budgetOutflowsCents: number;
  actualInflowsCents: number;
  actualOutflowsCents: number;
  forecastNetCents: number;
  actualNetCents: number;
  closingForecastCents: number;
  closingActualCents: number;
  varianceCents: number;
};

function formatMonth(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

async function computeForecast(months: number): Promise<Row[]> {
  const balances = await prismaClient.balance.findMany({ orderBy: { month: "asc" } });
  const base = balances.at(-1);
  const start = base ? monthStart(base.month) : monthStart(new Date());
  const opening0 = base?.sumOfCashCents ?? 0;

  const allReceivables = await prismaClient.accountsReceivable.findMany();
  const allPayables = await prismaClient.accountsPayable.findMany();
  const allBudgets = await prismaClient.monthlyBudget.findMany();

  const rows: Row[] = [];
  let rollingOpeningForecast = opening0;
  let rollingOpeningActual = opening0;

  for (let i = 0; i < months; i++) {
    const periodStart = addMonths(start, i);
    const monthKey = `${periodStart.getFullYear()}-${periodStart.getMonth() + 1}`;

    const isMonth = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}` === monthKey;

    const expectedInflows = allReceivables
      .filter((r) => !r.isPaid && isMonth(r.paymentDate))
      .reduce((sum, r) => sum + convertToEurCents(r.amountCents, r.currency), 0);
    const expectedOutflows = allPayables
      .filter((p) => !p.isPaid && isMonth(p.paymentDate))
      .reduce((sum, p) => sum + convertToEurCents(p.amountCents, p.currency), 0);

    const budgetInflows = allBudgets
      .filter((b) => isMonth(b.month))
      .reduce((sum, b) => sum + convertToEurCents(b.plannedInflowCents, b.currency), 0);
    const budgetOutflows = allBudgets
      .filter((b) => isMonth(b.month))
      .reduce((sum, b) => sum + convertToEurCents(b.plannedOutflowCents, b.currency), 0);

    const actualInflows = allReceivables
      .filter((r) => r.isPaid && isMonth(r.paymentDate))
      .reduce((sum, r) => sum + convertToEurCents(r.amountCents, r.currency), 0);
    const actualOutflows = allPayables
      .filter((p) => p.isPaid && isMonth(p.paymentDate))
      .reduce((sum, p) => sum + convertToEurCents(p.amountCents, p.currency), 0);

    const forecastNet = expectedInflows - expectedOutflows + budgetInflows - budgetOutflows;
    const actualNet = actualInflows - actualOutflows;

    const closingForecast = rollingOpeningForecast + forecastNet;
    const closingActual = rollingOpeningActual + actualNet;

    rows.push({
      period: formatMonth(periodStart),
      openingCents: rollingOpeningForecast,
      expectedInflowsCents: expectedInflows,
      expectedOutflowsCents: expectedOutflows,
      budgetInflowsCents: budgetInflows,
      budgetOutflowsCents: budgetOutflows,
      actualInflowsCents: actualInflows,
      actualOutflowsCents: actualOutflows,
      forecastNetCents: forecastNet,
      actualNetCents: actualNet,
      closingForecastCents: closingForecast,
      closingActualCents: closingActual,
      varianceCents: closingActual - closingForecast,
    });

    rollingOpeningForecast = closingForecast;
    rollingOpeningActual = closingActual;
  }

  return rows;
}

export default async function ForecastPage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = (await props.searchParams) ?? {};
  // Read simple GET filters
  const months = Math.min(Math.max(Number(searchParams?.months ?? "12") || 12, 1), 36);
  const varianceThresholdCents = Math.round((Number(searchParams?.varThreshold ?? "500") || 500) * 100);

  const rows = await computeForecast(months);
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Cash Flow Forecast</h2>
      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="block text-gray-600">Months</span>
          <select name="months" defaultValue={months} className="mt-1 rounded border px-2 py-1">
            {[6, 12, 18, 24, 36].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-600">Highlight variance ≥ (€)</span>
          <input name="varThreshold" type="number" step="1" defaultValue={Math.round(varianceThresholdCents / 100)} className="mt-1 w-28 rounded border px-2 py-1" />
        </label>
        <button className="h-8 rounded bg-blue-600 px-3 text-sm text-white">Apply</button>
      </form>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10 text-left">
            <tr className="bg-gray-100">
              <th className="px-2 py-2" />
              <th className="px-2 py-2" />
              <th className="px-2 py-2 text-center" colSpan={2}>AR/AP</th>
              <th className="px-2 py-2 text-center" colSpan={2}>Budget</th>
              <th className="px-2 py-2 text-center" colSpan={2}>Forecast</th>
              <th className="px-2 py-2 text-center" colSpan={4}>Actual</th>
              <th className="px-2 py-2 text-center" colSpan={1}>Var</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 w-16" title="Month (e.g., Sep 2025)">Period</th>
              <th className="px-2 py-2 w-20" title="Opening balance carried from prior month">Opening</th>
              <th className="px-2 py-2 w-20" title="Expected Inflows from unpaid receivables in this month">AR In</th>
              <th className="px-2 py-2 w-20" title="Expected Outflows from unpaid payables in this month">AP Out</th>
              <th className="px-2 py-2 w-20" title="Budget planned inflows for this month">B. In</th>
              <th className="px-2 py-2 w-20" title="Budget planned outflows for this month">B. Out</th>
              <th className="px-2 py-2 w-20" title="Total forecast net (AR/AP + Budget)">F. Net</th>
              <th className="px-2 py-2 w-20" title="Opening + Forecast Net">F. Close</th>
              <th className="px-2 py-2 w-20" title="Paid receivables in this month">Act. In</th>
              <th className="px-2 py-2 w-20" title="Paid payables in this month">Act. Out</th>
              <th className="px-2 py-2 w-20" title="Actual Inflows - Actual Outflows">Act. Net</th>
              <th className="px-2 py-2 w-20" title="Opening + Actual Net">Act. Close</th>
              <th className="px-2 py-2 w-20" title="Closing Actual - Closing Forecast">Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-t">
                <td className="px-2 py-2 w-16 text-sm">{r.period}</td>
                <td className="px-2 py-2 w-20 text-right text-sm">{centsToCurrencyString(r.openingCents)}</td>
                <td className="px-2 py-2 w-20 text-right text-sm bg-blue-50">{centsToCurrencyString(r.expectedInflowsCents)}</td>
                <td className="px-2 py-2 w-20 text-right text-sm bg-blue-50">{centsToCurrencyString(r.expectedOutflowsCents)}</td>
                <td className="px-2 py-2 w-20 text-right text-sm bg-green-50">{centsToCurrencyString(r.budgetInflowsCents)}</td>
                <td className="px-2 py-2 w-20 text-right text-sm bg-green-50">{centsToCurrencyString(r.budgetOutflowsCents)}</td>
                <td className={`px-2 py-2 w-20 text-right text-sm bg-slate-50 ${r.forecastNetCents >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {centsToCurrencyString(Math.abs(r.forecastNetCents))}
                </td>
                <td className="px-2 py-2 w-20 text-right text-sm bg-slate-50">{centsToCurrencyString(r.closingForecastCents)}</td>
                <td className="px-2 py-2 w-20 text-right text-sm">{centsToCurrencyString(r.actualInflowsCents)}</td>
                <td className="px-2 py-2 w-20 text-right text-sm">{centsToCurrencyString(r.actualOutflowsCents)}</td>
                <td className={`px-2 py-2 w-20 text-right text-sm ${r.actualNetCents >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {centsToCurrencyString(Math.abs(r.actualNetCents))}
                </td>
                <td className="px-2 py-2 w-20 text-right text-sm">{centsToCurrencyString(r.closingActualCents)}</td>
                <td className={`px-2 py-2 w-20 text-right text-sm font-medium ${r.varianceCents >= 0 ? "text-green-700" : "text-red-700"} ${Math.abs(r.varianceCents) >= varianceThresholdCents ? (r.varianceCents >= 0 ? "bg-green-50" : "bg-red-50") : ""}`}>
                  {r.varianceCents >= 0 ? "▲ " : "▼ "}
                  {centsToCurrencyString(Math.abs(r.varianceCents))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
