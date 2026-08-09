import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="safe-top flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">
          <span aria-hidden>🍽️</span>
        </div>
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <p className="mt-1 text-muted">Enter the app password to continue</p>
      </div>
      <LoginForm />
    </main>
  );
}
