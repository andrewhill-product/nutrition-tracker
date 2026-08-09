import {
  normaliseDate,
  parseNumber,
  type ColumnMap,
} from "@/lib/import/detect";

export type SheetData = { headers: string[]; rows: unknown[][] };

export type Estimate = {
  grams: number | null;
  portionDesc: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  sugar: number;
  confidence: number;
};

export type PreviewRow = {
  index: number;
  date: string | null;
  name: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fibre: number | null;
  sugar: number | null;
  included: boolean;
  estimate: Estimate | "failed" | null;
};

export function buildRows(sheet: SheetData, map: ColumnMap): PreviewRow[] {
  const rows: PreviewRow[] = [];
  for (let i = 0; i < sheet.rows.length; i++) {
    const raw = sheet.rows[i];
    if (raw.every((v) => v === undefined || v === null || v === "")) continue;
    const cell = (role: keyof ColumnMap) =>
      map[role] !== undefined ? raw[map[role]] : undefined;
    const nameRaw = cell("name");
    const name =
      typeof nameRaw === "string" ? nameRaw.trim() : nameRaw !== undefined ? String(nameRaw) : "";
    if (!name) continue;
    rows.push({
      index: i,
      date: normaliseDate(cell("date")),
      name,
      kcal: parseNumber(cell("kcal")),
      protein: parseNumber(cell("protein")),
      carbs: parseNumber(cell("carbs")),
      fat: parseNumber(cell("fat")),
      fibre: parseNumber(cell("fibre")),
      sugar: parseNumber(cell("sugar")),
      included: true,
      estimate: null,
    });
  }
  // Duplicate dates: keep the last by default, earlier rows excluded but
  // toggleable in the preview.
  const lastForDate = new Map<string, number>();
  for (const row of rows) if (row.date) lastForDate.set(row.date, row.index);
  for (const row of rows) {
    if (row.date && lastForDate.get(row.date) !== row.index) row.included = false;
  }
  return rows;
}

/** One planned dinner per date: for each date take the last included row. */
export function committedRows(rows: PreviewRow[]): PreviewRow[] {
  const byDate = new Map<string, PreviewRow>();
  for (const row of rows) {
    if (row.included && row.date) byDate.set(row.date, row);
  }
  return Array.from(byDate.values());
}
