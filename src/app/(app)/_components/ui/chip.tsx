"use client";

export function Chip({
  selected = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition ${
        selected
          ? "border-primary bg-primary-soft text-primary"
          : "border-line bg-surface text-ink"
      } ${className}`}
    />
  );
}
