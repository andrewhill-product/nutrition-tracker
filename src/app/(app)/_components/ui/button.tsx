"use client";

const VARIANTS = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-surface2 text-ink",
  danger: "bg-danger text-white",
  ghost: "bg-transparent text-primary",
} as const;

export function Button({
  variant = "primary",
  full = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  full?: boolean;
}) {
  return (
    <button
      {...props}
      className={`h-12 rounded-xl px-4 font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
        VARIANTS[variant]
      } ${full ? "w-full" : ""} ${className}`}
    />
  );
}
