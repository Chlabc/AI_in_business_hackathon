"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Sign-in failed");
        return;
      }
      const dest = data.redirectTo ?? search.get("next") ?? "/coach";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            className="brand-logo mb-5 inline-flex"
            aria-label="Cornerman home"
          >
            <span className="brand-logo-light">
              <Image
                src="/cornerman-logo-light.png"
                alt="Cornerman"
                width={2172}
                height={724}
                sizes="180px"
                priority
              />
            </span>
            <span className="brand-logo-dark">
              <Image
                src="/cornerman-logo-dark.png"
                alt="Cornerman"
                width={1672}
                height={941}
                sizes="180px"
                priority
              />
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-muted">
            Use your work email and password to continue.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="block text-sm font-medium text-foreground">
              Work email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                autoComplete="current-password"
              />
            </label>
            {error ? (
              <p
                className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          For demo purposes, you may choose a work email from the perspective of
          an employee or manager (e.g.{" "}
          <span className="font-medium text-foreground">
            alex@northline.demo
          </span>{" "}
          or{" "}
          <span className="font-medium text-foreground">
            jordan@northline.demo
          </span>
          ). Any password works.
        </p>

        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/" className="text-accent hover:underline">
            ← Back to landing
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted">
          Loading sign-in…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
