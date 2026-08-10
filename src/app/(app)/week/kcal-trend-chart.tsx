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

export type DayBar = { date: string; label: string; kcal: number };

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

  return (
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
          <Bar
            dataKey="kcal"
            radius={[6, 6, 0, 0]}
            onClick={(_, index) => {
              const day = days[index];
              if (day) router.push(`/today?date=${day.date}`);
            }}
          >
            {days.map((d) => (
              <Cell
                key={d.date}
                fill={d.kcal > target ? "var(--fat)" : "var(--primary)"}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
