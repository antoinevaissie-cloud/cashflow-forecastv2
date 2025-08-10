import { prismaClient } from "@/lib/prisma";
import { centsToCurrencyString } from "@/lib/money";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function togglePayablePaid(id: string, nextPaid: boolean) {
  "use server";
  await prismaClient.accountsPayable.update({
    where: { id },
    data: { isPaid: nextPaid },
  });
  revalidatePath("/payables");
}

export default async function PayablesPage() {
  const payables = await prismaClient.accountsPayable.findMany({
    orderBy: { paymentDate: "asc" },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Accounts Payable</h2>
        <Link href="/payables/new" className="rounded bg-blue-600 px-3 py-2 text-white">Add</Link>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Payment Date</th>
              <th className="px-4 py-2">Payee</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Paid</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payables.map((p) => (
              <tr key={p.id} className="border-t odd:bg-white even:bg-gray-50">
                <td className="px-4 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{p.payee}</td>
                <td className="px-4 py-2 text-right">{centsToCurrencyString(p.amountCents, p.currency)}</td>
                <td className="px-4 py-2">{p.isPaid ? "Y" : "N"}</td>
                <td className="px-4 py-2">
                  <form action={togglePayablePaid.bind(null, p.id, !p.isPaid)}>
                    <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50">
                      {p.isPaid ? "Mark Unpaid" : "Mark Paid"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
