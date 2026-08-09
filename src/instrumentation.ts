export async function register() {
  // Skip during `next build` so repo-import builds without secrets succeed.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { getEnv } = await import("@/lib/env");
  getEnv();
}
