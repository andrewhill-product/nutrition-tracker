"use client";

import { useSyncExternalStore } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = {
  date: string;
  label: string;
  kcal: number | null;
  avg: number | null;
};

/**
 * Adherence-neutral 30-day calorie line: daily points with a 7-day rolling
 * average so single days read as noise within a trend. One axis, no red.
 */
export function KcalTrend30({ points, target }: { points: TrendPoint[]; target: number }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const hasData = points.some((p) => p.kcal !== null);

  if (!mounted || !hasData) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
        {hasData ? "" : "Logged days appear here"}
      </div>
    );
  }

  return (
    <div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={6}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <ReferenceLine y={target} stroke="var(--muted)" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: "var(--line)" }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--ink)",
              }}
              formatter={(value, name) => [
                `${Math.round(Number(value))} kcal`,
                name === "kcal" ? "Day" : "7 day average",
              ]}
            />
            <Line
              dataKey="kcal"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "var(--primary)", strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              dataKey="avg"
              stroke="var(--muted)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-primary" aria-hidden /> Daily kcal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-muted" aria-hidden /> 7 day average
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t border-dashed border-muted" aria-hidden /> Target
        </span>
      </div>
    </div>
  );
}
