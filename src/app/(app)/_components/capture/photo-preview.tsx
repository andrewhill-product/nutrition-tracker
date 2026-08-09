"use client";

/* eslint-disable @next/next/no-img-element */

export function PhotoPreview({
  previewUrl,
  uploading,
}: {
  previewUrl: string | null;
  uploading: boolean;
}) {
  if (!previewUrl) return null;
  return (
    <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-2xl">
      <img src={previewUrl} alt="Your meal photo" className="h-full w-full object-cover" />
      {uploading && (
        <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-xs font-medium text-white">
          Uploading…
        </span>
      )}
    </div>
  );
}
