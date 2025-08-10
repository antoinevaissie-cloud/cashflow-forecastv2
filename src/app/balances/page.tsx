import { prismaClient } from "@/lib/prisma";
import { centsToCurrencyString, getGbpToEurRate, convertGbpCentsToEurCents } from "@/lib/money";
import Link from "next/link";

export default async function BalancesPage() {
  const balances = await prismaClient.balance.findMany({
    orderBy: { month: "asc" },
  });
  const rate = getGbpToEurRate();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Balances</h2>
        <Link href="/balances/new" className="rounded bg-blue-600 px-3 py-2 text-white">Add</Link>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Month (YYYY-MM)</th>
              <th className="px-4 py-2 text-right">Sum of Cash</th>
              <th className="px-4 py-2">Boursorama (EUR)</th>
              <th className="px-4 py-2">Boursorama Joint (EUR)</th>
              <th className="px-4 py-2">BNP (EUR)</th>
              <th className="px-4 py-2">Revolut (GBP)</th>
              <th className="px-4 py-2">Other Accounts</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id} className="border-t odd:bg-white even:bg-gray-50">
                <td className="px-4 py-2">{new Date(b.month).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">{centsToCurrencyString(b.sumOfCashCents)}</td>
                <td className="px-4 py-2">{centsToCurrencyString(b.boursoramaCents)}</td>
                <td className="px-4 py-2">{centsToCurrencyString(b.boursoramaJointCents)}</td>
                <td className="px-4 py-2">{centsToCurrencyString(b.bnpCents)}</td>
                <td className="px-4 py-2">{centsToCurrencyString(b.revolutGbpCents, "GBP")} <span className="text-xs text-gray-500">(~{centsToCurrencyString(convertGbpCentsToEurCents(b.revolutGbpCents, rate))} EUR)</span></td>
                <td className="px-4 py-2">{centsToCurrencyString(b.otherAccountsCents)}</td>
                <td className="px-4 py-2">{b.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
