"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export type DayBar = {
  date: string;
  label: string;
  kcal: number;
  // kcal split by macro energy share; "other" carries days with no macro data.
  protein: number;
  carbs: number;
  fat: number;
  other: number;
};

const SEGMENTS = [
  { key: "protein", fill: "var(--protein)", label: "Protein" },
  { key: "carbs", fill: "var(--carbs)", label: "Carbs" },
  { key: "fat", fill: "var(--fat)", label: "Fat" },
  { key: "other", fill: "var(--muted)", label: null },
] as const;

/** Client leaf: Recharts renders after mount to avoid SSR issues. */
export function KcalTrendChart({
  days,
  target,
}: {
  days: DayBar[];
  target: number;
}) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const hasData = days.some((d) => d.kcal > 0);

  if (!mounted || !hasData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-line text-sm text-muted">
        {hasData ? "" : "No logged days this week"}
      </div>
    );
  }

  const goToDay = (index: number) => {
    const day = days[index];
    if (day) router.push(`/today?date=${day.date}`);
  };

  return (
    <div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
            />
            <YAxis hide domain={[0, (max: number) => Math.max(max, target * 1.15)]} />
            <ReferenceLine
              y={target}
              stroke="var(--muted)"
              strokeDasharray="4 4"
              label={{
                value: `${target}`,
                position: "right",
                fontSize: 10,
                fill: "var(--muted)",
              }}
            />
            {SEGMENTS.map((seg) => (
              <Bar
                key={seg.key}
                dataKey={seg.key}
                stackId="kcal"
                fill={seg.fill}
                // "fat" tops the stack on macro days, "other" on macro-less
                // days; the unused one renders nothing, so both can be rounded.
                radius={seg.key === "fat" || seg.key === "other" ? [6, 6, 0, 0] : undefined}
                onClick={(_, index) => goToDay(index)}
              >
                {days.map((d) => (
                  <Cell key={d.date} cursor="pointer" />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted">
        {SEGMENTS.filter((s) => s.label).map((seg) => (
          <span key={seg.key} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: seg.fill }}
            />
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}
