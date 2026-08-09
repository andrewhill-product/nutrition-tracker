"use client";

/**
 * Labelled numeric input for one macro. Shows a pin when the value has been
 * individually overridden (so grams changes stop scaling it) with a Reset.
 */
export function MacroField({
  label,
  unit,
  value,
  overridden,
  canReset,
  onChange,
  onReset,
  integer = false,
}: {
  label: string;
  unit: string;
  value: number | null;
  overridden: boolean;
  canReset: boolean;
  onChange: (v: number | null) => void;
  onReset: () => void;
  integer?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5">
      <span className="flex items-center gap-1.5 text-sm text-muted">
        {label}
        {overridden && canReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-medium text-primary"
          >
            📌 Reset
          </button>
        )}
      </span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          inputMode={integer ? "numeric" : "decimal"}
          step={integer ? 1 : 0.1}
          min={0}
          value={value ?? ""}
          placeholder="0"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(null);
            const num = Number(raw);
            onChange(Number.isNaN(num) ? null : Math.max(0, num));
          }}
          className="tnum h-11 w-20 rounded-lg border border-line bg-surface text-center outline-none focus:border-primary"
        />
        <span className="w-8 text-sm text-muted">{unit}</span>
      </span>
    </label>
  );
}
