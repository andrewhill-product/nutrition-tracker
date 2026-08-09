"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { MealWithItems } from "@/lib/totals";
import { ReviewScreen } from "../../_components/review/review-screen";
import { draftFromMeal } from "../../_components/review/types";

export function MealReview({
  meal,
  mode,
}: {
  meal: MealWithItems;
  mode: "edit" | "conversion";
}) {
  const router = useRouter();
  const draft = useMemo(() => draftFromMeal(meal, mode), [meal, mode]);

  return (
    <ReviewScreen
      draft={draft}
      onClose={() => router.back()}
      onSaved={(date) => {
        router.push(`/?date=${date}`);
        router.refresh();
      }}
    />
  );
}
