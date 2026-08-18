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
  scaleFinals,
  type ReviewDraft,
} from "../review/types";
import { ActionSheet, type CaptureAction } from "./action-sheet";
import {
  AdditionsCard,
  type AdditionEntry,
  type IngredientDecision,
} from "./additions-card";
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
  | { step: "additions"; analysis: AnalysisResultT }
  | { step: "error"; message: string; retryable: boolean }
  | { step: "review"; draft: ReviewDraft };

function parseSlot(value: string | null): Slot | null {
  return value === "breakfast" ||
    value === "lunch" ||
    value === "dinner" ||
    value === "snack" ||
    value === "drink" ||
    value === "alcohol"
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

  const dateParam = pathname === "/today" ? searchParams.get("date") : null;
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
  const [labelPreviewUrl, setLabelPreviewUrl] = useState<string | null>(null);
  const [labelUploading, setLabelUploading] = useState(false);
  // Ingredients Andrew adds on the interstitial after a photo analysis.
  // Keyed so checklist state survives additions appearing mid-edit.
  const [additions, setAdditions] = useState<AdditionEntry[]>([]);
  const additionKey = useRef(0);
  const [addingIngredients, setAddingIngredients] = useState(false);
  const [additionsError, setAdditionsError] = useState<string | null>(null);

  // The slot picker still shows, pre-selected from the deep link until tapped.
  const effectiveSlot = slot ?? urlSlot;

  const uploadRef = useRef<Promise<string> | null>(null);
  const uploadSeq = useRef(0);
  const photoUrlRef = useRef<string | null>(null);
  const labelUploadRef = useRef<Promise<string> | null>(null);
  const labelUrlRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const labelInput = useRef<HTMLInputElement>(null);

  // Fire the deep link once per navigation (not once per session): key on the
  // full query string, and reset() strips the params so a repeat tap of the
  // same card navigates again and re-fires.
  const lastHandledDeepLink = useRef<string | null>(null);
  useEffect(() => {
    const key = searchParams.toString();
    if (
      (captureParam !== "photo" && captureParam !== "sheet" && captureParam !== "repeat") ||
      lastHandledDeepLink.current === key
    )
      return;
    lastHandledDeepLink.current = key;
    cancelledRef.current = false;
    const timer = setTimeout(() => {
      if (captureParam === "repeat") {
        setState((s) => (s.step === "closed" ? { step: "repeats" } : s));
        return;
      }
      // "sheet" opens the action sheet; "photo" additionally attempts the
      // camera (browsers that block a programmatic file-input click outside a
      // user gesture simply leave the sheet showing, one tap away).
      setState((s) => (s.step === "closed" ? { step: "sheet" } : s));
      if (captureParam === "photo") cameraInput.current?.click();
    }, 0);
    return () => clearTimeout(timer);
  }, [captureParam, searchParams]);

  const visible = pathname === "/" || pathname === "/today" || pathname === "/week";
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
    if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    setLabelPreviewUrl(null);
    setLabelUploading(false);
    uploadRef.current = null;
    photoUrlRef.current = null;
    labelUploadRef.current = null;
    labelUrlRef.current = null;
    setAdditions([]);
    setAddingIngredients(false);
    setAdditionsError(null);
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

  /**
   * Optional second photo: the packaging nutrition label (e.g. the back of a
   * cereal box). Uploaded in the background like the meal photo; analyse
   * sends both so the model reads exact values and scales them to the bowl.
   */
  async function handleLabelFile(file: File | undefined) {
    if (!file) return;
    const seq = uploadSeq.current;
    try {
      const { downscaleToJpeg } = await import("./photo");
      const blob = await downscaleToJpeg(file);
      if (cancelledRef.current || uploadSeq.current !== seq) return;
      setLabelPreviewUrl(URL.createObjectURL(blob));
      setLabelUploading(true);
      labelUploadRef.current = upload("meals/label.jpg", blob, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "image/jpeg",
      }).then((r) => {
        if (uploadSeq.current === seq && !cancelledRef.current) {
          labelUrlRef.current = r.url;
          setLabelUploading(false);
        }
        return r.url;
      });
      labelUploadRef.current.catch(() => {
        if (uploadSeq.current !== seq || cancelledRef.current) return;
        setLabelUploading(false);
        setLabelPreviewUrl(null);
        labelUploadRef.current = null;
      });
    } catch {
      if (uploadSeq.current === seq) setLabelPreviewUrl(null);
    }
  }

  /** Wrap a fresh draft as a conversion of the deep-linked planned meal. */
  function withConversion(draft: ReviewDraft): ReviewDraft {
    if (convertId === null) return draft;
    return { ...draft, mode: "conversion", mealId: convertId, status: "planned" };
  }

  /**
   * `noteOverride` is the discard-with-note path: the binned photo analysis
   * relaunches as a text analysis of Andrew's own description, and the meal
   * still carries the original photo via photoUrlRef.
   */
  async function analyse(noteOverride?: string) {
    // Guard against being wired as a DOM event handler: only a string counts.
    if (typeof noteOverride !== "string") noteOverride = undefined;
    cancelledRef.current = false;
    setState({ step: "analysing" });
    const isPhoto = noteOverride === undefined && kind === "photo";
    let body: object;
    if (noteOverride !== undefined) {
      body = { mode: "text", description: noteOverride };
    } else if (isPhoto) {
      try {
        const url = photoUrlRef.current ?? (await uploadRef.current);
        if (!url) throw new Error("no-upload");
        photoUrlRef.current = url;
        let label = labelUrlRef.current;
        if (!label && labelUploadRef.current) {
          label = await labelUploadRef.current.catch(() => null);
        }
        body = label
          ? { mode: "image", imageUrl: url, labelUrl: label }
          : { mode: "image", imageUrl: url };
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
        message: isPhoto
          ? "Claude could not find any food in this photo. Try a clearer shot, or enter the meal by hand."
          : "Claude could not find any food in that description. Try rewording it, or enter the meal by hand.",
        retryable: true,
      });
      return;
    }
    if (isPhoto) {
      // Photo analyses pause on an interstitial so anything the photo missed
      // (a drink, a dressing, a side out of frame) can be added and estimated
      // before the review gate.
      setAdditions([]);
      setAdditionsError(null);
      setState({ step: "additions", analysis: res.data });
      return;
    }
    setState({
      step: "review",
      draft: withConversion(
        draftFromAnalysis(res.data, {
          date,
          slot: effectiveSlot ?? "snack",
          source: "manual",
          photoUrl: photoUrlRef.current,
        })
      ),
    });
  }

  /**
   * Estimate ingredients typed on the interstitial: the same /api/analyse in
   * text mode, so additions arrive with full nutrients, count as real AI
   * estimates for calibration, and still face the review gate. Returns
   * whether the input box should clear.
   */
  async function estimateAdditions(text: string): Promise<boolean> {
    setAddingIngredients(true);
    setAdditionsError(null);
    const res = await fetchJson<AnalysisResultT>("/api/analyse", {
      method: "POST",
      body: JSON.stringify({ mode: "text", description: text }),
    });
    setAddingIngredients(false);
    if (cancelledRef.current) return false;
    if (!res.ok) {
      setAdditionsError(res.error);
      return false;
    }
    if (res.data.items.length === 0) {
      setAdditionsError(
        "Claude could not make anything of that. Try rewording it."
      );
      return false;
    }
    setAdditions((prev) => [
      ...prev,
      ...res.data.items.map((item) => ({ key: ++additionKey.current, item })),
    ]);
    return true;
  }

  /**
   * Cancelling at the additions step bins a fresh analysis, so it feeds the
   * discard-learning loop like closing a draft review does. Best-effort and
   * note-less ("binned without saying what it was"); never blocks the close.
   */
  function discardFromAdditions(analysis: AnalysisResultT) {
    const summary = analysis.items
      .map((i) => `${i.name} ${i.grams}g ${i.kcal} kcal`)
      .join("; ");
    void fetchJson("/api/discards", {
      method: "POST",
      body: JSON.stringify({
        source: "photo",
        ai_meal_name: (analysis.meal_name || "Meal").slice(0, 200),
        ai_items_summary: (summary || "no items").slice(0, 2000),
        note: null,
      }),
    });
    reset();
  }

  /**
   * Apply the checklist decisions and open review. Unticked ingredients
   * arrive pre-marked removed (they still reach meal_items, so calibration
   * learns "that was not in the meal"); a changed quantity arrives as an
   * edited verdict with macros scaled linearly from the AI baseline. The
   * ai_* values are never touched: they stay the model's actual estimate.
   */
  function continueToReview(analysis: AnalysisResultT, decisions: IngredientDecision[]) {
    const combined = { ...analysis, items: decisions.map((d) => d.item) };
    const draft = draftFromAnalysis(combined, {
      date,
      slot: effectiveSlot ?? "snack",
      source: "photo",
      photoUrl: photoUrlRef.current,
    });
    draft.items = draft.items.map((item, i) => {
      const d = decisions[i];
      if (!d.included) return { ...item, verdict: "removed" as const };
      const aiQty = d.isCount ? item.ai.count : item.ai.grams;
      if (aiQty === null || aiQty <= 0 || d.qty === aiQty) return item;
      if (d.isCount && (item.ai.grams === null || item.ai.grams <= 0)) {
        // Countable item with no gram baseline: scale macros by the count.
        const f = d.qty / aiQty;
        const scale = (v: number | null, dp: 0 | 1) =>
          v === null ? null : dp === 0 ? Math.round(v * f) : Math.round(v * f * 10) / 10;
        return {
          ...item,
          verdict: "edited" as const,
          final: {
            count: d.qty,
            grams: item.ai.grams,
            kcal: scale(item.ai.kcal, 0),
            protein: scale(item.ai.protein, 1),
            carbs: scale(item.ai.carbs, 1),
            fat: scale(item.ai.fat, 1),
            fibre: scale(item.ai.fibre, 1),
            sugar: scale(item.ai.sugar, 1),
          },
        };
      }
      const grams = d.isCount
        ? Math.round((item.ai.grams as number) * (d.qty / aiQty))
        : Math.round(d.qty);
      const final = scaleFinals(item, grams);
      if (d.isCount) final.count = d.qty;
      return { ...item, verdict: "edited" as const, final };
    });
    setState({ step: "review", draft: withConversion(draft) });
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
        photo_url: r.photoUrl,
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
    router.push(`/today?date=${savedDate}`);
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
      <input
        ref={labelInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleLabelFile(e.target.files?.[0]);
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
              <ReviewScreen
                draft={state.draft}
                onClose={reset}
                onSaved={onSaved}
                onDiscardWithNote={(note) => {
                  setKind("text");
                  setDescription(note);
                  void analyse(note);
                }}
              />
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
                    labelPreviewUrl={kind === "photo" && !manualPending ? labelPreviewUrl : null}
                    labelUploading={labelUploading}
                    onAddLabel={
                      kind === "photo" && !manualPending
                        ? () => labelInput.current?.click()
                        : undefined
                    }
                    actionLabel={manualPending ? "Continue" : "Analyse"}
                    onSlotChange={setSlot}
                    onAnalyse={manualPending ? openManualReview : () => analyse()}
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
                        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left disabled:opacity-60"
                      >
                        {r.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.photoUrl}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-xl object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
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
                {state.step === "additions" && (
                  <AdditionsCard
                    analysis={state.analysis}
                    additions={additions}
                    adding={addingIngredients}
                    error={additionsError}
                    onAdd={estimateAdditions}
                    onContinue={(decisions) =>
                      continueToReview(state.analysis, decisions)
                    }
                    onCancel={() => discardFromAdditions(state.analysis)}
                  />
                )}
                {state.step === "error" && (
                  <ErrorCard
                    message={state.message}
                    onRetry={state.retryable ? () => analyse() : undefined}
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
