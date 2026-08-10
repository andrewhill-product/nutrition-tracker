import type { Slot } from "./schemas";

/** Single source of truth for slot naming. Andrew calls the evening meal Tea. */
export const SLOT_LABELS: Record<Slot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Tea",
  snack: "Snack",
  drink: "Drink",
};

/** Display order for slot groups. */
export const SLOT_LIST: Slot[] = ["breakfast", "lunch", "dinner", "snack", "drink"];
