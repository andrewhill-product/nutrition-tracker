import Link from "next/link";
import { formatShort } from "@/lib/dates";
import type { MealWithItems } from "@/lib/totals";

type RowStatus = "Logged as planned" | "Swapped" | "Not logged" | "Planned";

const STATUS_STYLE: Record<RowStatus, string> = {
  "Logged as planned": "bg-fibre/15 text-fibre",
  Swapped: "bg-amber-soft text-amber-ink",
  "Not logged": "bg-surface2 text-muted",
  Planned: "bg-primary-soft text-primary",
};

export function PlannedVsActual({
  dates,
  meals,
  today,
}: {
  dates: string[];
  meals: MealWithItems[];
  today: string;
}) {
  const rows = dates.flatMap((date) => {
    const dinners = meals.filter((m) => m.date === date && m.slot === "dinner");
    const planned = dinners.find((m) => m.status === "planned");
    const logged = dinners.filter((m) => m.status === "logged");
    const fromPlan = logged.find((m) => m.source === "spreadsheet");
    if (!planned && !fromPlan) return [];

    let status: RowStatus;
    let label: string;
    let href: string;
    if (fromPlan) {
      status = "Logged as planned";
      label = fromPlan.name;
      href = `/meal/${fromPlan.id}`;
    } else if (planned && logged.length > 0) {
      status = "Swapped";
      label = `${logged[0].name} (planned: ${planned.name})`;
      href = `/meal/${logged[0].id}`;
    } else if (planned && date < today) {
      status = "Not logged";
      label = planned.name;
      href = `/meal/${planned.id}`;
    } else {
      status = "Planned";
      label = planned!.name;
      href = `/meal/${planned!.id}`;
    }
    return [{ date, status, label, href }];
  });

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-semibold">Tea: planned vs actual</h2>
      <div className="divide-y divide-line">
        {rows.map((row) => (
          <Link
            key={row.date}
            href={row.href}
            className="flex items-center justify-between gap-2 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-xs text-muted">{formatShort(row.date)}</p>
              <p className="truncate text-sm font-medium">{row.label}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[row.status]}`}
            >
              {row.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
