"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { AnalysisResultT } from "@/lib/schemas";
import { AddItemCard } from "./add-item-card";
import { DiscardSheet } from "./discard-sheet";
import { ItemCard } from "./item-card";
import { PhotoTools } from "./photo-tools";
import { ReviewFooter } from "./review-footer";
import { ReviewHeader } from "./review-header";
import {
  itemFromAnalysis,
  liveTotals,
  toPayloadItems,
  type ReviewDraft,
  type ReviewItem,
} from "./types";

/**
 * The human evaluation step, shared by new drafts, edit mode and conversion
 * mode. Save is gated until every item has an explicit verdict.
 */
export function ReviewScreen({
  draft,
  onClose,
  onSaved,
  onDiscardWithNote,
}: {
  draft: ReviewDraft;
  onClose: () => void;
  onSaved: (date: string) => void;
  /** Draft mode only: relaunch analysis from the user's own description. */
  onDiscardWithNote?: (note: string) => void;
}) {
  const [name, setName] = useState(draft.name);
  const [items, setItems] = useState<ReviewItem[]>(draft.items);
  const [photoUrl, setPhotoUrl] = useState(draft.photoUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repeatMessage, setRepeatMessage] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [discardBusy, setDiscardBusy] = useState(false);
  const [reanalysing, setReanalysing] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const unreviewed = items.filter((i) => i.verdict === null).length;
  const kept = items.filter((i) => i.verdict !== "removed").length;

  // Save must wait for every in-flight side effect, not just its own POST.
  const anyBusy = busy || reanalysing || photoUploading;

  // A binned fresh analysis is worth recording: an unsaved draft, or a
  // conversion built from a fresh photo (items with AI values but no DB row).
  // Re-opened saved meals never qualify.
  const isAiDraft =
    draft.mode !== "edit" &&
    draft.items.some((i) => i.ai.confidence !== null && i.dbId === undefined);

  /**
   * Record the binned analysis (with what the meal actually was, when told),
   * then close, or hand the note back so capture relaunches analysis from it.
   * The record uses the AI's original reading, not any renames made since.
   * Recording is best-effort: a failed write never traps the user here.
   */
  async function discard(note: string | null, logFromNote: boolean) {
    if (isAiDraft) {
      setDiscardBusy(true);
      const summary = draft.items
        .filter((i) => i.ai.kcal !== null)
        .map((i) => `${i.name} ${i.ai.grams ?? "?"}g ${i.ai.kcal} kcal`)
        .join("; ");
      const res = await fetchJson("/api/discards", {
        method: "POST",
        body: JSON.stringify({
          source: draft.source === "photo" ? "photo" : "text",
          ai_meal_name: draft.name.slice(0, 200),
          ai_items_summary: (summary || "no items").slice(0, 2000),
          note,
        }),
      });
      if (!res.ok) console.error("[discard] not recorded:", res.error);
      setDiscardBusy(false);
    }
    if (logFromNote && note && onDiscardWithNote) onDiscardWithNote(note);
    else onClose();
  }

  /** Fresh analysis of the photo, with the current names as identification. */
  async function reanalyse() {
    if (photoUrl === null || reanalysing) return;
    setReanalysing(true);
    setError(null);
    const keptNames = items
      .filter((i) => i.verdict !== "removed")
      .map((i) => i.name)
      .join(", ");
    const res = await fetchJson<AnalysisResultT>("/api/analyse", {
      method: "POST",
      body: JSON.stringify({
        mode: "image",
        imageUrl: photoUrl,
        hint: `"${name.trim() || draft.name}"${keptNames ? ` containing ${keptNames}` : ""}`.slice(0, 500),
      }),
    });
    setReanalysing(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data.items.length === 0) {
      setError("Claude could not find any food in the photo. Your items are unchanged.");
      return;
    }
    setItems(res.data.items.map(itemFromAnalysis));
  }

  function updateItem(next: ReviewItem) {
    setItems((prev) => prev.map((i) => (i.key === next.key ? next : i)));
  }

  function basePayload() {
    return {
      date: draft.date,
      slot: draft.slot,
      name: name.trim() || "Meal",
      photo_url: photoUrl,
      notes: draft.aiNotes,
    };
  }

  async function save() {
    if (anyBusy) return;
    setBusy(true);
    setError(null);
    const payloadItems = toPayloadItems(items.filter((i) => i.verdict !== null));
    const res =
      draft.mode === "draft"
        ? await fetchJson<{ id: number }>("/api/meals", {
            method: "POST",
            body: JSON.stringify({
              ...basePayload(),
              source: draft.source,
              status: "logged",
              items: payloadItems,
            }),
          })
        : await fetchJson<{ id: number }>(`/api/meals/${draft.mealId}`, {
            method: "PUT",
            body: JSON.stringify({
              ...basePayload(),
              ...(draft.mode === "conversion" && draft.photoUrl
                ? { source: draft.source }
                : {}),
              status: "logged",
              items: payloadItems,
            }),
          });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(draft.date);
  }

  async function savePlan() {
    if (anyBusy || draft.mealId === undefined) return;
    setBusy(true);
    setError(null);
    const res = await fetchJson<{ id: number }>(`/api/meals/${draft.mealId}`, {
      method: "PUT",
      body: JSON.stringify({
        ...basePayload(),
        status: "planned",
        items: toPayloadItems(items, { fallbackVerdict: "up", keepFinals: true }),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(draft.date);
  }

  /** Save the kept, reviewed items as a repeat template (edit mode only). */
  async function saveAsRepeat() {
    if (anyBusy) return;
    const kept = items.filter(
      (i) => i.verdict !== "removed" && i.final.kcal !== null
    );
    if (kept.length === 0) {
      setRepeatMessage("Nothing to save: no items with calories.");
      return;
    }
    setBusy(true);
    setRepeatMessage(null);
    const res = await fetchJson<{ id: number }>("/api/repeats", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim() || "Meal",
        slot: draft.slot,
        // The meal's photo rides along so replays never need re-photographing.
        photo_url: photoUrl,
        items: kept.map((i) => ({
          name: i.name,
          grams: i.final.grams,
          kcal: i.final.kcal,
          protein_g: i.final.protein,
          carbs_g: i.final.carbs,
          fat_g: i.final.fat,
          fibre_g: i.final.fibre,
          sugar_g: i.final.sugar,
        })),
      }),
    });
    setBusy(false);
    setRepeatMessage(
      res.ok
        ? "Saved. It is now in the + menu under Log a repeat meal."
        : res.error
    );
  }

  async function deleteMeal() {
    if (anyBusy || draft.mealId === undefined) return;
    setBusy(true);
    setError(null);
    const res = await fetchJson<{ id: number }>(`/api/meals/${draft.mealId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(draft.date);
  }

  return (
    <div className="flex min-h-dvh flex-col gap-4 px-4 pt-4">
      <ReviewHeader
        name={name}
        slot={draft.slot}
        date={draft.date}
        photoUrl={photoUrl}
        aiNotes={draft.mode === "draft" ? draft.aiNotes : null}
        onNameChange={setName}
        onClose={() => setClosing(true)}
      />
      <div className="flex-1 space-y-3">
        {items.map((item) => (
          <ItemCard key={item.key} item={item} onChange={updateItem} />
        ))}
        <AddItemCard
          startOpen={items.length === 0}
          onAdd={(item) => setItems((prev) => [...prev, item])}
        />
      </div>
      {draft.mode === "edit" && (
        <div className="space-y-2">
          <PhotoTools
            photoUrl={photoUrl}
            busy={busy}
            reanalysing={reanalysing}
            onPhotoUploaded={setPhotoUrl}
            onReanalyse={reanalyse}
            onUploadingChange={setPhotoUploading}
          />
          {photoUrl !== null && draft.photoUrl === null && (
            <p className="text-sm text-muted">Photo added. Save to keep it.</p>
          )}
          {repeatMessage && (
            <p className="text-sm text-muted">{repeatMessage}</p>
          )}
          <button
            type="button"
            onClick={saveAsRepeat}
            disabled={anyBusy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface2 font-semibold disabled:opacity-50"
          >
            🔁 Save as repeat
          </button>
        </div>
      )}
      <ReviewFooter
        totals={liveTotals(items)}
        unreviewedCount={unreviewed}
        keptCount={kept}
        mode={draft.mode}
        busy={anyBusy}
        error={error}
        onSave={save}
        onSavePlan={draft.mode === "conversion" ? savePlan : undefined}
        onDelete={draft.mode !== "draft" ? deleteMeal : undefined}
      />
      {closing && (
        <DiscardSheet
          canNote={isAiDraft}
          busy={discardBusy}
          onKeep={() => setClosing(false)}
          onDiscard={discard}
        />
      )}
    </div>
  );
}
