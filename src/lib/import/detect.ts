/**
 * Client-safe column detection and UK-priority date normalisation for the
 * spreadsheet import. No SheetJS dependency: values arrive already parsed
 * (cellDates gives JS Dates; leftover Excel serials are converted here).
 */

export type ColumnRole =
  | "date"
  | "name"
  | "kcal"
  | "protein"
  | "carbs"
  | "fat"
  | "fibre"
  | "sugar";

export type ColumnMap = Partial<Record<ColumnRole, number>>;

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** JS dates, Excel serials, dd/mm/yyyy (UK priority) and ISO strings. */
export function normaliseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // SheetJS cellDates gives dates parsed against UTC-ish sheet values; use
    // local parts first, falling back to UTC when midnight rolls over.
    const y = value.getFullYear();
    if (y > 1970) return `${y}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 20000 || value > 80000) return null;
    const d = new Date(EXCEL_EPOCH_MS + Math.round(value) * 86_400_000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) {
    const [, y, m, d] = iso;
    return validate(Number(y), Number(m), Number(d));
  }

  // UK priority: day first.
  const dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
  if (dmy) {
    const [, d, m, y] = dmy;
    let year = Number(y);
    if (year < 100) year += 2000;
    let day = Number(d);
    let month = Number(m);
    // Fall back to month-first only when day-first is impossible.
    if (month > 12 && day <= 12) [day, month] = [month, day];
    return validate(year, month, day);
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime()) && /[a-zA-Z]{3}/.test(s)) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }
  return null;
}

function validate(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && value.trim() !== "" && n >= 0) return n;
  }
  return null;
}

const HEADER_PATTERNS: [ColumnRole, RegExp][] = [
  ["date", /date|day|when/i],
  ["kcal", /kcal|calor|energy/i],
  ["protein", /protein/i],
  ["carbs", /carb/i],
  ["fibre", /fib/i],
  ["sugar", /sugar/i],
  ["fat", /fat/i],
  ["name", /meal|name|dinner|food|dish|recipe/i],
];

/**
 * Detect columns: headers by regex, else date by >= 60% parseable values and
 * name by the first mostly-text column. Guesses are correctable via chips.
 */
export function detectColumns(headers: string[], rows: unknown[][]): ColumnMap {
  const map: ColumnMap = {};
  const used = new Set<number>();

  for (const [role, pattern] of HEADER_PATTERNS) {
    if (map[role] !== undefined) continue;
    const idx = headers.findIndex((h, i) => !used.has(i) && pattern.test(h));
    if (idx >= 0) {
      map[role] = idx;
      used.add(idx);
    }
  }

  const sample = rows.slice(0, 20);
  const colCount = Math.max(headers.length, ...sample.map((r) => r.length), 0);

  if (map.date === undefined) {
    for (let c = 0; c < colCount; c++) {
      if (used.has(c)) continue;
      const values = sample.map((r) => r[c]).filter((v) => v !== undefined && v !== "");
      if (values.length === 0) continue;
      const parseable = values.filter((v) => normaliseDate(v) !== null).length;
      if (parseable / values.length >= 0.6) {
        map.date = c;
        used.add(c);
        break;
      }
    }
  }

  if (map.name === undefined) {
    for (let c = 0; c < colCount; c++) {
      if (used.has(c)) continue;
      const values = sample.map((r) => r[c]).filter((v) => v !== undefined && v !== "");
      if (values.length === 0) continue;
      const texty = values.filter(
        (v) => typeof v === "string" && v.trim() !== "" && normaliseDate(v) === null && !/^\d+(\.\d+)?$/.test(v.trim())
      ).length;
      if (texty / values.length >= 0.6) {
        map.name = c;
        used.add(c);
        break;
      }
    }
  }

  return map;
}
