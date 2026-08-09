import { Suspense } from "react";
import { CaptureLauncher } from "./_components/capture/capture-launcher";
import { OfflineBanner } from "./_components/offline-banner";
import { SwRegister } from "./_components/sw-register";
import { TabBar } from "./_components/tab-bar";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <OfflineBanner />
      <main className="flex-1 pb-40">{children}</main>
      <Suspense fallback={null}>
        <CaptureLauncher />
      </Suspense>
      <TabBar />
      <SwRegister />
    </div>
  );
}
