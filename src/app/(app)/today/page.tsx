import { isDateString, todayLondon } from "@/lib/dates";
import { getDay, getTargets } from "@/lib/queries";
import { dayTotals } from "@/lib/totals";
import { DateHeader } from "../_today/date-header";
import { SwipeDays } from "../_today/swipe-days";
import { KcalRing } from "../_today/kcal-ring";
import { MacroBars } from "../_today/macro-bars";
import { MealCard } from "../_today/meal-card";
import { PlannedDinnerCard } from "../_today/planned-dinner-card";
import { SlotGroup } from "../_today/slot-group";

export const dynamic = "force-dynamic";

const SLOTS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Tea" },
  { value: "snack", label: "Snacks" },
  { value: "drink", label: "Drinks" },
] as const;

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date =
    params.date && isDateString(params.date) ? params.date : todayLondon();

  const [meals, targets] = await Promise.all([getDay(date), getTargets()]);
  const totals = dayTotals(meals);
  const logged = meals.filter((m) => m.status === "logged");
  const planned = meals.filter((m) => m.status === "planned");

  return (
    <SwipeDays date={date}>
      <DateHeader date={date} />
      <div className="space-y-6 px-4 py-5">
        <KcalRing kcal={totals.kcal} target={targets.kcal} />
        <MacroBars
          values={{
            protein: totals.protein_g,
            carbs: totals.carbs_g,
            fat: totals.fat_g,
            fibre: totals.fibre_g,
            sugar: totals.sugar_g,
          }}
          targets={{
            protein: targets.proteinG,
            carbs: targets.carbsG,
            fat: targets.fatG,
            fibre: targets.fibreG,
            sugar: targets.sugarG,
          }}
        />

        {logged.length === 0 && planned.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
            <p className="font-medium">Nothing logged for this day yet.</p>
            <p className="mt-1 text-sm">
              Tap the + button to photograph a meal or type one in.
            </p>
          </div>
        )}

        {SLOTS.map((slot) => {
          const slotLogged = logged.filter((m) => m.slot === slot.value);
          const slotPlanned = planned.filter((m) => m.slot === slot.value);
          if (slotLogged.length === 0 && slotPlanned.length === 0) return null;
          return (
            <SlotGroup key={slot.value} label={slot.label}>
              {slotLogged.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
              {slotPlanned.map((meal) => (
                <PlannedDinnerCard key={meal.id} meal={meal} />
              ))}
            </SlotGroup>
          );
        })}
      </div>
    </SwipeDays>
  );
}
