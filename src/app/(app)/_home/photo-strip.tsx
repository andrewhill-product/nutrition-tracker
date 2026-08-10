/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { relativeLabel, todayLondon } from "@/lib/dates";

export type PhotoMeal = {
  id: number;
  name: string;
  date: string;
  photoUrl: string | null;
};

/** Recent photographed meals, newest first. Hidden entirely when none exist. */
export function PhotoStrip({ meals }: { meals: PhotoMeal[] }) {
  const withPhotos = meals.filter((m) => m.photoUrl !== null);
  if (withPhotos.length === 0) return null;
  const today = todayLondon();
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Recent meals
      </h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {withPhotos.map((m) => (
          <Link key={m.id} href={`/meal/${m.id}`} className="w-20 shrink-0">
            <img
              src={m.photoUrl!}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover"
            />
            <p className="mt-1 truncate text-[11px] font-medium">{m.name}</p>
            <p className="text-[11px] text-muted">{relativeLabel(m.date, today)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
