"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );

  if (online) return null;
  return (
    <div className="safe-top sticky top-0 z-40 bg-amber-soft px-4 py-2 text-center text-sm font-medium text-amber-ink">
      You are offline. Changes cannot be saved until you reconnect.
    </div>
  );
}
