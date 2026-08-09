"use client";

import type { ColumnMap, ColumnRole } from "@/lib/import/detect";
import { Chip } from "../_components/ui/chip";

const ROLES: { role: ColumnRole; label: string }[] = [
  { role: "date", label: "Date" },
  { role: "name", label: "Meal name" },
  { role: "kcal", label: "kcal" },
  { role: "protein", label: "Protein" },
  { role: "carbs", label: "Carbs" },
  { role: "fat", label: "Fat" },
  { role: "fibre", label: "Fibre" },
];

/** Tappable chips to correct the column guesses. */
export function MappingChips({
  headers,
  map,
  onChange,
}: {
  headers: string[];
  map: ColumnMap;
  onChange: (map: ColumnMap) => void;
}) {
  return (
    <div className="space-y-3">
      {ROLES.map(({ role, label }) => (
        <div key={role}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
            {(role === "date" || role === "name") && " (required)"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {headers.map((header, idx) => (
              <Chip
                key={idx}
                selected={map[role] === idx}
                className="h-9 px-3 text-xs"
                onClick={() => {
                  const next = { ...map };
                  if (next[role] === idx) delete next[role];
                  else {
                    for (const r of Object.keys(next) as ColumnRole[]) {
                      if (next[r] === idx) delete next[r];
                    }
                    next[role] = idx;
                  }
                  onChange(next);
                }}
              >
                {header || `Column ${idx + 1}`}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
