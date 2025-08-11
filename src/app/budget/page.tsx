import { prismaClient } from "@/lib/prisma";
import { centsToCurrencyString, eurosToCents } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { startOfMonth, format, subMonths } from "date-fns";

async function addBudgetItem(formData: FormData) {
  "use server";
  const monthStr = String(formData.get("month") || "");
  const category = String(formData.get("category") || "");
  const inflowAmount = Number(formData.get("inflowAmount") || 0);
  const outflowAmount = Number(formData.get("outflowAmount") || 0);
  
  const month = new Date(monthStr);
  const monthStart = startOfMonth(month);
  
  await prismaClient.monthlyBudget.upsert({
    where: { 
      month_category: { 
        month: monthStart, 
        category 
      }
    },
    update: {
      plannedInflowCents: eurosToCents(inflowAmount),
      plannedOutflowCents: eurosToCents(outflowAmount),
    },
    create: {
      month: monthStart,
      category,
      plannedInflowCents: eurosToCents(inflowAmount),
      plannedOutflowCents: eurosToCents(outflowAmount),
      currency: "EUR",
    },
  });
  revalidatePath("/budget");
}

async function deleteBudgetItem(id: string) {
  "use server";
  await prismaClient.monthlyBudget.delete({
    where: { id },
  });
  revalidatePath("/budget");
}

async function copyBudgetFromPreviousMonth(formData: FormData) {
  "use server";
  const monthStr = String(formData.get("month") || "");
  const month = new Date(monthStr);
  const currentMonthStart = startOfMonth(month);
  const previousMonthStart = startOfMonth(subMonths(month, 1));
  
  const previousBudget = await prismaClient.monthlyBudget.findMany({
    where: { month: previousMonthStart },
  });

  if (previousBudget.length > 0) {
    const newBudgetItems = previousBudget.map(item => ({
      month: currentMonthStart,
      category: item.category,
      plannedInflowCents: item.plannedInflowCents,
      plannedOutflowCents: item.plannedOutflowCents,
      currency: item.currency,
    }));

    for (const item of newBudgetItems) {
      await prismaClient.monthlyBudget.upsert({
        where: {
          month_category: {
            month: item.month,
            category: item.category,
          },
        },
        update: {},
        create: item,
      });
    }
  }
  
  revalidatePath("/budget");
}

export default async function BudgetPage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = (await props.searchParams) ?? {};
  const monthParam = String(searchParams?.month ?? "");
  const selectedMonth = monthParam ? new Date(monthParam) : new Date();
  const monthStart = startOfMonth(selectedMonth);
  
  const budgetItems = await prismaClient.monthlyBudget.findMany({
    where: { month: monthStart },
    orderBy: { category: "asc" },
  });

  const monthValue = format(monthStart, "yyyy-MM");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Monthly Budget</h2>
        <form action={copyBudgetFromPreviousMonth} className="inline">
          <input type="hidden" name="month" value={monthValue} />
          <button className="rounded bg-green-600 px-3 py-2 text-white">
            Copy Last Month
          </button>
        </form>
      </div>

      <form className="mb-4" method="get">
        <label className="flex items-center gap-2">
          <span className="text-sm">Month:</span>
          <input 
            type="month" 
            name="month" 
            defaultValue={monthValue}
            className="rounded border px-2 py-1"
          />
          <button className="rounded bg-blue-600 px-3 py-1 text-white">
            Load
          </button>
        </label>
      </form>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Planned Inflows</th>
              <th className="px-4 py-2 text-right">Planned Outflows</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {budgetItems.map((item) => (
              <BudgetRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded border bg-gray-50 p-4">
        <h3 className="mb-2 font-medium">Add New Category</h3>
        <form action={addBudgetItem} className="flex gap-2 flex-wrap">
          <input type="hidden" name="month" value={monthValue} />
          <input
            name="category"
            placeholder="Category name"
            className="rounded border px-2 py-1"
            required
          />
          <input
            type="number"
            step="0.01"
            name="inflowAmount"
            placeholder="Inflow (EUR)"
            className="w-24 rounded border px-2 py-1"
          />
          <input
            type="number"
            step="0.01"
            name="outflowAmount"
            placeholder="Outflow (EUR)"
            className="w-24 rounded border px-2 py-1"
          />
          <button className="rounded bg-blue-600 px-3 py-1 text-white">
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

function BudgetRow({ item }: { item: { id: string; category: string; plannedInflowCents: number; plannedOutflowCents: number; currency: string } }) {
  return (
    <tr className="border-t odd:bg-white even:bg-gray-50">
      <td className="px-4 py-2">{item.category}</td>
      <td className="px-4 py-2 text-right">
        {item.plannedInflowCents > 0 ? centsToCurrencyString(item.plannedInflowCents, item.currency) : "-"}
      </td>
      <td className="px-4 py-2 text-right">
        {item.plannedOutflowCents > 0 ? centsToCurrencyString(item.plannedOutflowCents, item.currency) : "-"}
      </td>
      <td className="px-4 py-2">
        <form action={deleteBudgetItem.bind(null, item.id)} className="inline">
          <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50">
            Delete
          </button>
        </form>
      </td>
    </tr>
  );
}