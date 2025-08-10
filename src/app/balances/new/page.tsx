import { prismaClient } from "@/lib/prisma";
import { eurosToCents, poundsToCents, getGbpToEurRate, convertGbpCentsToEurCents } from "@/lib/money";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function create(formData: FormData) {
  "use server";
  const month = new Date(String(formData.get("month") || new Date()));
  const boursorama = Number(formData.get("boursorama") || 0);
  const boursoramaJoint = Number(formData.get("boursoramaJoint") || 0);
  const bnp = Number(formData.get("bnp") || 0);
  const revolutGbp = Number(formData.get("revolutGbp") || 0);
  const other = Number(formData.get("other") || 0);
  const notes = String(formData.get("notes") || "");

  const rate = getGbpToEurRate();
  const eurCents = eurosToCents(boursorama + boursoramaJoint + bnp + other);
  const revolutGbpCents = poundsToCents(revolutGbp);
  const revolutAsEurCents = convertGbpCentsToEurCents(revolutGbpCents, rate);
  const sumCents = eurCents + revolutAsEurCents;

  await prismaClient.balance.create({
    data: {
      month,
      boursoramaCents: eurosToCents(boursorama),
      boursoramaJointCents: eurosToCents(boursoramaJoint),
      bnpCents: eurosToCents(bnp),
      revolutGbpCents: revolutGbpCents,
      otherAccountsCents: eurosToCents(other),
      sumOfCashCents: sumCents,
      notes,
    },
  });
  redirect("/balances");
}

export default function NewBalance() {
  return (
    <form action={create} className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">New Balance</h2>
      <label className="block">
        <span className="block text-sm">Month (YYYY-MM)</span>
        <input type="month" name="month" className="mt-1 w-full rounded border p-2" required />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm">Boursorama (EUR)</span>
          <input type="number" step="0.01" name="boursorama" className="mt-1 w-full rounded border p-2" required />
        </label>
        <label className="block">
          <span className="block text-sm">Boursorama Joint (EUR)</span>
          <input type="number" step="0.01" name="boursoramaJoint" className="mt-1 w-full rounded border p-2" required />
        </label>
        <label className="block">
          <span className="block text-sm">BNP (EUR)</span>
          <input type="number" step="0.01" name="bnp" className="mt-1 w-full rounded border p-2" required />
        </label>
        <label className="block">
          <span className="block text-sm">Revolut (GBP)</span>
          <input type="number" step="0.01" name="revolutGbp" className="mt-1 w-full rounded border p-2" required />
        </label>
        <label className="block col-span-2">
          <span className="block text-sm">Other Accounts (EUR)</span>
          <input type="number" step="0.01" name="other" className="mt-1 w-full rounded border p-2" required />
        </label>
      </div>
      <label className="block">
        <span className="block text-sm">Notes</span>
        <textarea name="notes" className="mt-1 w-full rounded border p-2" rows={3} />
      </label>
      <button className="rounded bg-blue-600 px-3 py-2 text-white">Save</button>
    </form>
  );
}
