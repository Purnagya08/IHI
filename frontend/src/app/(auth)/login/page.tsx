import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--organizer-bg)] flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading sign in…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}