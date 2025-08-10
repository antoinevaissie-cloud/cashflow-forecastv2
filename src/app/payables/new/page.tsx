import { prismaClient } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function create(formData: FormData) {
  "use server";
  const payee = String(formData.get("payee") || "");
  const description = String(formData.get("description") || "");
  const amount = Number(formData.get("amount") || 0);
  const paymentDate = new Date(String(formData.get("paymentDate") || new Date()));
  const isPaid = String(formData.get("isPaid")) === "on";
  await prismaClient.accountsPayable.create({
    data: {
      payee,
      description,
      amountCents: eurosToCents(amount),
      currency: "EUR",
      paymentDate,
      isPaid,
    },
  });
  redirect("/payables");
}

export default function NewPayable() {
  return (
    <form action={create} className="max-w-lg space-y-4">
      <h2 className="text-xl font-semibold">New Payable</h2>
      <label className="block">
        <span className="block text-sm">Payee</span>
        <input name="payee" className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="block">
        <span className="block text-sm">Description</span>
        <input name="description" className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="block">
        <span className="block text-sm">Amount (EUR)</span>
        <input type="number" step="0.01" name="amount" className="mt-1 w-full rounded border p-2" required />
      </label>
      <label className="block">
        <span className="block text-sm">Payment Date</span>
        <input type="date" name="paymentDate" className="mt-1 w-full rounded border p-2" required />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="isPaid" /> Paid
      </label>
      <button className="rounded bg-blue-600 px-3 py-2 text-white">Save</button>
    </form>
  );
}
