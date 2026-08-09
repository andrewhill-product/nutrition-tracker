import { notFound } from "next/navigation";
import { getMeal } from "@/lib/queries";
import { MealReview } from "./meal-review";

export const dynamic = "force-dynamic";

export default async function MealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ convert?: string }>;
}) {
  const { id } = await params;
  const { convert } = await searchParams;
  const mealId = Number(id);
  if (!Number.isInteger(mealId) || mealId <= 0) notFound();
  const meal = await getMeal(mealId);
  if (!meal) notFound();

  // A planned meal always opens in conversion mode: verdicts reset to
  // unreviewed so the Save gate applies exactly as for a fresh analysis.
  const mode = meal.status === "planned" || convert === "1" ? "conversion" : "edit";

  return <MealReview meal={meal} mode={mode} />;
}
