import { prismaClient } from "@/lib/prisma";
import { centsToCurrencyString, convertToEurCents } from "@/lib/money";

type Row = {
  period: string;
  openingCents: number;
  expectedInflowsCents: number;
  expectedOutflowsCents: number;
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

    const actualInflows = allReceivables
      .filter((r) => r.isPaid && isMonth(r.paymentDate))
      .reduce((sum, r) => sum + convertToEurCents(r.amountCents, r.currency), 0);
    const actualOutflows = allPayables
      .filter((p) => p.isPaid && isMonth(p.paymentDate))
      .reduce((sum, p) => sum + convertToEurCents(p.amountCents, p.currency), 0);

    const forecastNet = expectedInflows - expectedOutflows;
    const actualNet = actualInflows - actualOutflows;

    const closingForecast = rollingOpeningForecast + forecastNet;
    const closingActual = rollingOpeningActual + actualNet;

    rows.push({
      period: formatMonth(periodStart),
      openingCents: rollingOpeningForecast,
      expectedInflowsCents: expectedInflows,
      expectedOutflowsCents: expectedOutflows,
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

export default async function ForecastPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const searchParams = props.searchParams ?? {};
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
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 text-left">
            <tr className="bg-gray-100">
              <th className="px-4 py-2" />
              <th className="px-4 py-2" />
              <th className="px-4 py-2 text-center" colSpan={4}>Forecast</th>
              <th className="px-4 py-2 text-center" colSpan={4}>Actual</th>
              <th className="px-4 py-2 text-center" colSpan={1}>Variance</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="px-4 py-2" title="Month (e.g., Sep 2025)">Period</th>
              <th className="px-4 py-2" title="Opening balance carried from prior month">Opening (EUR)</th>
              <th className="px-4 py-2" title="Expected Inflows from unpaid receivables in this month">Expected Inflows</th>
              <th className="px-4 py-2" title="Expected Outflows from unpaid payables in this month">Expected Outflows</th>
              <th className="px-4 py-2" title="Expected Inflows - Expected Outflows">Forecast Net</th>
              <th className="px-4 py-2" title="Opening + Forecast Net">Closing Forecast</th>
              <th className="px-4 py-2" title="Paid receivables in this month">Actual Inflows</th>
              <th className="px-4 py-2" title="Paid payables in this month">Actual Outflows</th>
              <th className="px-4 py-2" title="Actual Inflows - Actual Outflows">Actual Net</th>
              <th className="px-4 py-2" title="Opening + Actual Net">Closing Actual</th>
              <th className="px-4 py-2" title="Closing Actual - Closing Forecast">Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-t">
                <td className="px-4 py-2">{r.period}</td>
                <td className="px-4 py-2 text-right">{centsToCurrencyString(r.openingCents)}</td>
                <td className="px-4 py-2 text-right bg-slate-50">{centsToCurrencyString(r.expectedInflowsCents)}</td>
                <td className="px-4 py-2 text-right bg-slate-50">{centsToCurrencyString(r.expectedOutflowsCents)}</td>
                <td className="px-4 py-2 text-right bg-slate-50">{centsToCurrencyString(r.forecastNetCents)}</td>
                <td className="px-4 py-2 text-right bg-slate-50">{centsToCurrencyString(r.closingForecastCents)}</td>
                <td className="px-4 py-2 text-right">{centsToCurrencyString(r.actualInflowsCents)}</td>
                <td className="px-4 py-2 text-right">{centsToCurrencyString(r.actualOutflowsCents)}</td>
                <td className="px-4 py-2 text-right">{centsToCurrencyString(r.actualNetCents)}</td>
                <td className="px-4 py-2 text-right">{centsToCurrencyString(r.closingActualCents)}</td>
                <td className={`px-4 py-2 text-right font-medium ${r.varianceCents >= 0 ? "text-green-700" : "text-red-700"} ${Math.abs(r.varianceCents) >= varianceThresholdCents ? (r.varianceCents >= 0 ? "bg-green-50" : "bg-red-50") : ""}`}>
                  {r.varianceCents >= 0 ? "▲ " : "▼ "}
                  {centsToCurrencyString(r.varianceCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
