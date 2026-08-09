export function ExportButton() {
  return (
    <a
      href="/api/export"
      download
      className="flex h-12 w-full items-center justify-center rounded-xl bg-surface2 font-semibold"
    >
      Export all data (CSV)
    </a>
  );
}
