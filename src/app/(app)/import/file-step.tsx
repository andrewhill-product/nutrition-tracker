"use client";

import { useState } from "react";
import type { SheetData } from "./types";

/** Client-side SheetJS parse of the first sheet; instant preview, no upload. */
export function FileStep({ onParsed }: { onParsed: (sheet: SheetData) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("empty");
      const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
        header: 1,
        defval: "",
      });
      if (grid.length === 0) throw new Error("empty");
      const headers = (grid[0] ?? []).map((h) => String(h ?? ""));
      onParsed({ headers, rows: grid.slice(1) });
    } catch {
      setError(
        "Could not read that file. Save it as .csv or .xlsx and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Choose a .csv or .xlsx file of planned evening meals. It needs a date
        column and a meal name column; calories and macros are optional.
      </p>
      <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-muted">
        <span className="text-3xl" aria-hidden>
          📄
        </span>
        <span className="font-semibold">{busy ? "Reading…" : "Choose a file"}</span>
        <input
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
