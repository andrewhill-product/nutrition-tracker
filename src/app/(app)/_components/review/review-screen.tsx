"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { AddItemCard } from "./add-item-card";
import { ItemCard } from "./item-card";
import { ReviewFooter } from "./review-footer";
import { ReviewHeader } from "./review-header";
import {
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
}: {
  draft: ReviewDraft;
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const [name, setName] = useState(draft.name);
  const [items, setItems] = useState<ReviewItem[]>(draft.items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreviewed = items.filter((i) => i.verdict === null).length;
  const kept = items.filter((i) => i.verdict !== "removed").length;

  function updateItem(next: ReviewItem) {
    setItems((prev) => prev.map((i) => (i.key === next.key ? next : i)));
  }

  function basePayload() {
    return {
      date: draft.date,
      slot: draft.slot,
      name: name.trim() || "Meal",
      photo_url: draft.photoUrl,
      notes: draft.aiNotes,
    };
  }

  async function save() {
    if (busy) return;
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
    if (busy || draft.mealId === undefined) return;
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

  async function deleteMeal() {
    if (busy || draft.mealId === undefined) return;
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
        photoUrl={draft.photoUrl}
        aiNotes={draft.mode === "draft" ? draft.aiNotes : null}
        onNameChange={setName}
        onClose={onClose}
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
      <ReviewFooter
        totals={liveTotals(items)}
        unreviewedCount={unreviewed}
        keptCount={kept}
        mode={draft.mode}
        busy={busy}
        error={error}
        onSave={save}
        onSavePlan={draft.mode === "conversion" ? savePlan : undefined}
        onDelete={draft.mode !== "draft" ? deleteMeal : undefined}
      />
    </div>
  );
}
