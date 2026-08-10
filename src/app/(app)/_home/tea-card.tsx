/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { MealWithItems } from "@/lib/totals";

/**
 * Tonight's planned Tea, front and centre: the one piece of "what is next"
 * the evening actually needs. No calorie number on the card face.
 */
export function TeaCard({ plannedTea }: { plannedTea: MealWithItems | null }) {
  if (!plannedTea) {
    return (
      <p className="text-center text-sm text-muted">
        No Tea planned tonight.{" "}
        <Link href="/import" className="font-medium text-primary">
          Import your meal plan
        </Link>
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Tonight&apos;s Tea
      </p>
      <div className="mt-1 flex items-center gap-3">
        {plannedTea.photoUrl && (
          <img
            src={plannedTea.photoUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
        )}
        <p className="min-w-0 flex-1 truncate text-lg font-semibold">{plannedTea.name}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/meal/${plannedTea.id}?convert=1`}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-on-primary"
        >
          Log it
        </Link>
        <Link
          href={`/today?date=${plannedTea.date}&capture=photo&slot=dinner&convert=${plannedTea.id}`}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-surface2 text-sm font-semibold"
        >
          Snap it instead
        </Link>
      </div>
    </div>
  );
}
