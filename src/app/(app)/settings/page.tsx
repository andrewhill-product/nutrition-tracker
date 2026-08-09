import Link from "next/link";
import { getActiveNotes, getTargets } from "@/lib/queries";
import { CalibrationCard } from "./calibration-card";
import { ExportButton } from "./export-button";
import { SignOutButton } from "./sign-out-button";
import { TargetsForm } from "./targets-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [targets, notes] = await Promise.all([getTargets(), getActiveNotes()]);

  return (
    <div className="space-y-4 px-4 py-5">
      <h1 className="safe-top text-2xl font-bold">Settings</h1>
      <TargetsForm
        initial={{
          kcal: targets.kcal,
          protein_g: targets.proteinG,
          carbs_g: targets.carbsG,
          fat_g: targets.fatG,
          fibre_g: targets.fibreG,
          sugar_g: targets.sugarG,
        }}
      />
      <CalibrationCard notes={notes} />
      <Link
        href="/import"
        className="flex h-12 w-full items-center justify-center rounded-xl bg-surface2 font-semibold"
      >
        Import a meal plan spreadsheet
      </Link>
      <ExportButton />
      <SignOutButton />
    </div>
  );
}
