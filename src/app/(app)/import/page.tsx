import { getPlannedDinnerDates } from "@/lib/queries";
import { ImportFlow } from "./import-flow";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const plannedDates = await getPlannedDinnerDates();
  return <ImportFlow plannedDates={plannedDates} />;
}
