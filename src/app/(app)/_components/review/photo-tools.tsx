"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { Button } from "../ui/button";

/**
 * Edit-mode photo tools: attach a photo to a meal saved without one (the
 * photo is kept on Save), and optionally re-analyse the meal from its photo.
 * Re-analysis never fires without an explicit confirm, because it replaces
 * the current items.
 */
export function PhotoTools({
  photoUrl,
  busy,
  reanalysing,
  onPhotoUploaded,
  onReanalyse,
  onUploadingChange,
}: {
  photoUrl: string | null;
  busy: boolean;
  reanalysing: boolean;
  onPhotoUploaded: (url: string) => void;
  onReanalyse: () => void;
  /** Lifted so the screen can gate Save while the photo is still uploading. */
  onUploadingChange: (uploading: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function markUploading(v: boolean) {
    setUploading(v);
    onUploadingChange(v);
  }

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    markUploading(true);
    setError(null);
    try {
      const { downscaleToJpeg } = await import("../capture/photo");
      const blob = await downscaleToJpeg(file);
      const r = await upload("meals/photo.jpg", blob, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "image/jpeg",
      });
      onPhotoUploaded(r.url);
    } catch {
      setError("The photo upload failed. Check your connection and try again.");
    }
    markUploading(false);
  }

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {photoUrl === null ? (
        <Button
          variant="secondary"
          full
          disabled={uploading || busy}
          onClick={() => input.current?.click()}
        >
          {uploading ? "Uploading…" : "📷 Add a photo"}
        </Button>
      ) : confirming ? (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <p className="text-sm text-muted">
            Replace this meal&apos;s items with a fresh analysis of the photo?
            Nothing changes in your diary until you save.
          </p>
          <div className="flex gap-2">
            <Button
              full
              disabled={reanalysing || busy}
              onClick={() => {
                setConfirming(false);
                onReanalyse();
              }}
            >
              Re-analyse
            </Button>
            <Button
              variant="secondary"
              full
              disabled={reanalysing}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          full
          disabled={reanalysing || busy}
          onClick={() => setConfirming(true)}
        >
          {reanalysing ? "Re-analysing…" : "🔄 Re-analyse from photo"}
        </Button>
      )}
    </div>
  );
}
