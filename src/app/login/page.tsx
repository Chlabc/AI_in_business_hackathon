"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { DEMO_ACCOUNTS } from "@/data/users";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(nextEmail: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });
      const data = (await res.json()) as {
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Sign-in failed");
        return;
      }
      const dest =
        search.get("next") && data.redirectTo
          ? // Prefer role home over a forbidden next path
            data.redirectTo
          : (data.redirectTo ?? "/coach");
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(email);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
      <div>
        <p className="eyebrow">Sign in</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Open as employee or manager
        </h1>
        <p className="mt-3 text-sm text-muted">
          Enter your work email to continue. Pick a role below to sign in
          quickly.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={loading}
            onClick={() => {
              setEmail(a.email);
              void submit(a.email);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-accent disabled:opacity-50"
          >
            {a.fillLabel}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-muted">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
            autoComplete="username"
          />
        </label>
        {error ? (
          <p
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>

      <p className="text-xs text-muted">
        <Link href="/" className="text-accent hover:underline">
          ← Back to landing
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-16 text-sm text-muted">Loading sign-in…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
