"use client";

import { upload } from "@vercel/blob/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatShort, relativeLabel, todayLondon } from "@/lib/dates";
import { fetchJson } from "@/lib/fetchJson";
import type { RepeatWithItems } from "@/lib/queries";
import type { AnalysisResultT, Slot } from "@/lib/schemas";
import { SLOT_LABELS } from "@/lib/slots";
import { ReviewScreen } from "../review/review-screen";
import {
  draftFromAnalysis,
  emptyDraft,
  type ReviewDraft,
} from "../review/types";
import { ActionSheet, type CaptureAction } from "./action-sheet";
import { AnalysingCard } from "./analysing-card";
import { ErrorCard } from "./error-card";
import { SlotPicker } from "./slot-picker";
import { TextQuickAdd } from "./text-quick-add";

type Step =
  | { step: "closed" }
  | { step: "sheet" }
  | { step: "text" }
  | { step: "slot" }
  | { step: "repeats" }
  | { step: "analysing" }
  | { step: "error"; message: string; retryable: boolean }
  | { step: "review"; draft: ReviewDraft };

function parseSlot(value: string | null): Slot | null {
  return value === "breakfast" ||
    value === "lunch" ||
    value === "dinner" ||
    value === "snack" ||
    value === "drink"
    ? value
    : null;
}

/**
 * The floating capture button and the whole capture overlay. The draft lives
 * in React memory only; abandoning it loses nothing but the photo upload.
 *
 * Deep link from a planned dinner card: /?date=X&capture=photo&slot=dinner&convert=<id>
 * pre-selects the slot, opens the camera, and makes the resulting review a
 * conversion of that planned meal (PUT, source updated to photo) rather than a
 * brand-new meal.
 */
export function CaptureLauncher({ repeats }: { repeats: RepeatWithItems[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = todayLondon();

  const dateParam = pathname === "/" ? searchParams.get("date") : null;
  const date = dateParam ?? today;

  const captureParam = searchParams.get("capture");
  const urlSlot = captureParam === "photo" ? parseSlot(searchParams.get("slot")) : null;
  const convertRaw = captureParam === "photo" ? Number(searchParams.get("convert")) : NaN;
  const convertId = Number.isInteger(convertRaw) && convertRaw > 0 ? convertRaw : null;

  const [state, setState] = useState<Step>({ step: "closed" });
  const [kind, setKind] = useState<"photo" | "text">("text");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [manualPending, setManualPending] = useState(false);
  const [description, setDescription] = useState("");
  const [busyRepeatId, setBusyRepeatId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // The slot picker still shows, pre-selected from the deep link until tapped.
  const effectiveSlot = slot ?? urlSlot;

  const uploadRef = useRef<Promise<string> | null>(null);
  const uploadSeq = useRef(0);
  const photoUrlRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  // Fire the deep link once per navigation (not once per session): key on the
  // full query string, and reset() strips the params so a repeat tap of the
  // same card navigates again and re-fires.
  const lastHandledDeepLink = useRef<string | null>(null);
  useEffect(() => {
    const key = searchParams.toString();
    if (captureParam !== "photo" || lastHandledDeepLink.current === key) return;
    lastHandledDeepLink.current = key;
    cancelledRef.current = false;
    // Open the action sheet as a guaranteed visible response, and attempt the
    // camera directly (browsers that block a programmatic file-input click
    // outside a user gesture simply leave the sheet showing, one tap away).
    const timer = setTimeout(() => {
      setState((s) => (s.step === "closed" ? { step: "sheet" } : s));
      cameraInput.current?.click();
    }, 0);
    return () => clearTimeout(timer);
  }, [captureParam, searchParams]);

  const visible = pathname === "/" || pathname === "/week";
  if (!visible) return null;

  function stripCaptureParams() {
    if (captureParam === null) return;
    lastHandledDeepLink.current = null;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("capture");
    params.delete("slot");
    params.delete("convert");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function reset() {
    cancelledRef.current = true;
    uploadSeq.current += 1;
    setState({ step: "closed" });
    setSlot(null);
    setManualPending(false);
    setDescription("");
    setUploading(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    uploadRef.current = null;
    photoUrlRef.current = null;
    stripCaptureParams();
  }

  function handleAction(action: CaptureAction) {
    if (action === "import") {
      setState({ step: "closed" });
      router.push("/import");
      return;
    }
    if (action === "text") {
      setKind("text");
      setState({ step: "text" });
      return;
    }
    if (action === "repeat") {
      setState({ step: "repeats" });
      return;
    }
    (action === "camera" ? cameraInput : libraryInput).current?.click();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    cancelledRef.current = false;
    const seq = ++uploadSeq.current;
    setKind("photo");
    setManualPending(false);
    setState({ step: "slot" });
    try {
      const { downscaleToJpeg } = await import("./photo");
      const blob = await downscaleToJpeg(file);
      if (cancelledRef.current || uploadSeq.current !== seq) return;
      setPreviewUrl(URL.createObjectURL(blob));
      setUploading(true);
      // Background upload while the slot is picked; Analyse awaits it.
      // The upload token adds a random suffix, so a constant name is safe.
      uploadRef.current = upload("meals/photo.jpg", blob, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "image/jpeg",
      }).then((r) => {
        // A cancelled draft's upload must not resurrect into the next one.
        if (uploadSeq.current === seq && !cancelledRef.current) {
          photoUrlRef.current = r.url;
          setUploading(false);
        }
        return r.url;
      });
      uploadRef.current.catch(() => {
        if (uploadSeq.current !== seq || cancelledRef.current) return;
        setUploading(false);
        setState((s) =>
          s.step === "slot" || s.step === "analysing"
            ? { step: "error", message: "The photo upload failed. Check your connection and try again.", retryable: false }
            : s
        );
      });
    } catch {
      if (uploadSeq.current !== seq) return;
      setState({
        step: "error",
        message: "We could not read that photo. Try taking it again.",
        retryable: false,
      });
    }
  }

  /** Wrap a fresh draft as a conversion of the deep-linked planned meal. */
  function withConversion(draft: ReviewDraft): ReviewDraft {
    if (convertId === null) return draft;
    return { ...draft, mode: "conversion", mealId: convertId, status: "planned" };
  }

  async function analyse() {
    cancelledRef.current = false;
    setState({ step: "analysing" });
    let body: object;
    if (kind === "photo") {
      try {
        const url = photoUrlRef.current ?? (await uploadRef.current);
        if (!url) throw new Error("no-upload");
        photoUrlRef.current = url;
        body = { mode: "image", imageUrl: url };
      } catch {
        setState({ step: "error", message: "The photo upload failed. Check your connection and try again.", retryable: false });
        return;
      }
    } else {
      body = { mode: "text", description: description.trim() };
    }
    const res = await fetchJson<AnalysisResultT>("/api/analyse", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (cancelledRef.current) return;
    if (!res.ok) {
      setState({ step: "error", message: res.error, retryable: true });
      return;
    }
    if (res.data.items.length === 0) {
      setState({
        step: "error",
        message:
          kind === "photo"
            ? "Claude could not find any food in this photo. Try a clearer shot, or enter the meal by hand."
            : "Claude could not find any food in that description. Try rewording it, or enter the meal by hand.",
        retryable: true,
      });
      return;
    }
    setState({
      step: "review",
      draft: withConversion(
        draftFromAnalysis(res.data, {
          date,
          slot: effectiveSlot ?? "snack",
          source: kind === "photo" ? "photo" : "manual",
          photoUrl: photoUrlRef.current,
        })
      ),
    });
  }

  function openManualReview() {
    setManualPending(false);
    setState({
      step: "review",
      draft: withConversion(
        emptyDraft({
          date,
          slot: effectiveSlot ?? "snack",
          source: "manual",
          photoUrl: photoUrlRef.current,
        })
      ),
    });
  }

  function enterByHand() {
    // Never infer the slot: if it was not picked yet, show the picker first.
    if (effectiveSlot === null) {
      setManualPending(true);
      setState({ step: "slot" });
      return;
    }
    openManualReview();
  }

  /**
   * Log a repeat: replays the template's human-approved finals as manual
   * "edited" items. No AI call, no calibration influence (ai_* stays null),
   * and the meal is editable afterwards like any other.
   */
  async function logRepeat(r: RepeatWithItems) {
    if (busyRepeatId !== null) return;
    setBusyRepeatId(r.id);
    const res = await fetchJson<{ id: number }>("/api/meals", {
      method: "POST",
      body: JSON.stringify({
        date,
        slot: r.slot,
        name: r.name,
        source: "manual",
        status: "logged",
        items: r.items.map((i) => ({
          name: i.name,
          verdict: "edited",
          final_grams: i.grams ?? 0,
          final_kcal: i.kcal,
          final_protein_g: i.proteinG,
          final_carbs_g: i.carbsG,
          final_fat_g: i.fatG,
          final_fibre_g: i.fibreG,
          final_sugar_g: i.sugarG,
        })),
      }),
    });
    setBusyRepeatId(null);
    if (!res.ok) {
      setState({ step: "error", message: res.error, retryable: false });
      return;
    }
    onSaved(date);
  }

  function onSaved(savedDate: string) {
    reset();
    router.push(`/?date=${savedDate}`);
    router.refresh();
  }

  const overlayOpen = state.step !== "closed" && state.step !== "sheet";

  return (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        aria-label="Add a meal"
        onClick={() => {
          cancelledRef.current = false;
          setState({ step: "sheet" });
        }}
        className="fixed bottom-20 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-3xl text-on-primary shadow-lg active:scale-95"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        +
      </button>

      <ActionSheet
        open={state.step === "sheet"}
        nonTodayDate={date !== today ? formatShort(date) : null}
        hasRepeats={repeats.length > 0}
        onAction={handleAction}
        onClose={reset}
      />

      {overlayOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-bg">
          <div className="safe-top mx-auto w-full max-w-lg">
            {state.step === "review" ? (
              <ReviewScreen draft={state.draft} onClose={reset} onSaved={onSaved} />
            ) : (
              <div className="px-4 py-6">
                {state.step === "text" && (
                  <TextQuickAdd
                    value={description}
                    onChange={setDescription}
                    onNext={() => setState({ step: "slot" })}
                    onCancel={reset}
                  />
                )}
                {state.step === "slot" && (
                  <SlotPicker
                    slot={effectiveSlot}
                    date={date}
                    today={today}
                    previewUrl={kind === "photo" && !manualPending ? previewUrl : null}
                    uploading={manualPending ? false : uploading}
                    actionLabel={manualPending ? "Continue" : "Analyse"}
                    onSlotChange={setSlot}
                    onAnalyse={manualPending ? openManualReview : analyse}
                    onCancel={reset}
                  />
                )}
                {state.step === "repeats" && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Log a repeat meal</h2>
                    <p className="text-sm text-muted">
                      Logging to {relativeLabel(date, today)} with your saved values.
                      No analysis call is made.
                    </p>
                    {repeats.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        disabled={busyRepeatId !== null}
                        onClick={() => logRepeat(r)}
                        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-4 text-left disabled:opacity-60"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{r.name}</p>
                          <p className="text-xs text-muted">{SLOT_LABELS[r.slot]}</p>
                        </div>
                        <span className="tnum shrink-0 font-bold">
                          {busyRepeatId === r.id
                            ? "Logging…"
                            : `${r.items.reduce((s, i) => s + i.kcal, 0)} kcal`}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={reset}
                      className="flex h-12 w-full items-center justify-center rounded-xl font-semibold text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {state.step === "analysing" && <AnalysingCard onCancel={reset} />}
                {state.step === "error" && (
                  <ErrorCard
                    message={state.message}
                    onRetry={state.retryable ? analyse : undefined}
                    onManual={enterByHand}
                    onCancel={reset}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
