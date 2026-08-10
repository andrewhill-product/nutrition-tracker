import Link from "next/link";
import { formatLong, mondayOf, todayLondon } from "@/lib/dates";
import {
  getDay,
  getRange,
  getRecentPhotoMeals,
  getTargets,
} from "@/lib/queries";
import { SLOT_LABELS } from "@/lib/slots";
import { dayTotals } from "@/lib/totals";
import { GlanceCard } from "./_home/glance-card";
import { PhotoStrip } from "./_home/photo-strip";
import { TeaCard } from "./_home/tea-card";

export const dynamic = "force-dynamic";

function londonHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(new Date())
  );
}

/**
 * The calm front door. One loud element (the camera button); everything else
 * is soft, descriptive and optional. Exact numbers live on Today, one tap
 * away. Copy is factual, never evaluative.
 */
export default async function HomePage() {
  const today = todayLondon();
  const hour = londonHour();
  const [meals, targets, photoMeals, weekMeals] = await Promise.all([
    getDay(today),
    getTargets(),
    getRecentPhotoMeals(8),
    getRange(mondayOf(today), today),
  ]);
  const logged = meals.filter((m) => m.status === "logged");
  const totals = dayTotals(meals);
  const plannedTea =
    meals.find((m) => m.slot === "dinner" && m.status === "planned") ?? null;
  const daysLoggedThisWeek = new Set(
    weekMeals.filter((m) => m.status === "logged").map((m) => m.date)
  ).size;

  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const slotLogged = (slot: string) => logged.some((m) => m.slot === slot);
  const suggestion =
    hour < 11
      ? slotLogged("breakfast")
        ? "Breakfast logged"
        : "Log breakfast?"
      : hour < 16
        ? slotLogged("lunch")
          ? "Lunch logged"
          : "Log lunch?"
        : plannedTea
          ? `Tea tonight: ${plannedTea.name}`
          : slotLogged("dinner")
            ? "Tea logged"
            : "Log tea?";

  const loggedSlots = Array.from(new Set(logged.map((m) => m.slot)));
  const phrase =
    loggedSlots.length === 0
      ? "Nothing logged yet today"
      : loggedSlots
          .map((s, i) => {
            const label = SLOT_LABELS[s];
            return i === 0 ? label : label.toLowerCase();
          })
          .join(" and ") + " logged";

  const glance = <GlanceCard totals={totals} targets={targets} phrase={phrase} />;
  const tea = <TeaCard plannedTea={plannedTea} />;

  return (
    <div className="safe-top space-y-6 px-4 py-6">
      <header>
        <h1 className="text-3xl font-bold">{greeting}, Andrew</h1>
        <p className="mt-1 text-muted">{formatLong(today)}</p>
        <p className="mt-3 text-lg font-medium">{suggestion}</p>
      </header>

      <div className="flex flex-col items-center gap-2 py-2">
        <Link
          href="/?capture=sheet"
          aria-label="Add a meal"
          className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </Link>
        <span className="text-sm font-semibold">Add a meal</span>
      </div>

      {hour < 12 ? (
        <>
          {glance}
          {tea}
        </>
      ) : (
        <>
          {tea}
          {glance}
        </>
      )}

      <PhotoStrip meals={photoMeals} />

      {daysLoggedThisWeek > 0 && (
        <p className="tnum text-center text-sm text-muted">
          {daysLoggedThisWeek} {daysLoggedThisWeek === 1 ? "day" : "days"} logged this week
        </p>
      )}
    </div>
  );
}
