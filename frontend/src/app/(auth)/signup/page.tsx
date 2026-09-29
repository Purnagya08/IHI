import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[var(--organizer-bg)] flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading signup…</div>}>
        <SignupForm />
      </Suspense>
    </main>
  );
}