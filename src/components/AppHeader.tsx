"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DayIcon, NightIcon } from "@/components/ThemeIcons";
import {
  DiagnosisIcon,
  DrillIcon,
  LightbulbIcon,
  LockIcon,
  ManagerIcon,
  ScenariosIcon,
  ScoreIcon,
} from "@/components/NavIcons";
import { useTheme } from "@/components/ThemeProvider";
import type { SessionUser } from "@/lib/auth-types";
import { navForRole } from "@/lib/auth-nav";

type AppHeaderProps = {
  user?: SessionUser | null;
  /** "marketing" is the public landing page — no rep context, one clear CTA. */
  variant?: "app" | "marketing";
};

type IconComponent = (props: { className?: string }) => React.ReactElement;

/** Labels come from auth-nav (the source of truth for what a role may see); icons are looked up here. */
const NAV_ICONS: Record<string, IconComponent> = {
  "/coach": DiagnosisIcon,
  "/coach/learn": LightbulbIcon,
  "/coach/training": ScenariosIcon,
  "/coach/practice": DrillIcon,
  "/coach/value": ScoreIcon,
  "/coach/manager": ManagerIcon,
  "/coach/playbook": ScenariosIcon,
  "/coach/health": ScoreIcon,
  "/login": LockIcon,
};

/** Full lockup (glove + wordmark) from public/cornerman-logo.png. */
function BrandLogo() {
  return (
    <Image
      src="/cornerman-logo.png"
      alt="Cornerman"
      width={2172}
      height={724}
      className="h-9 w-auto"
      priority
    />
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:border-accent"
      aria-label={
        theme === "light" ? "Switch to night mode" : "Switch to day mode"
      }
      title={theme === "light" ? "Night mode" : "Day mode"}
    >
      {theme === "light" ? (
        <NightIcon className="h-[18px] w-[18px]" />
      ) : (
        <DayIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}

export function AppHeader({
  user = null,
  variant = "app",
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const nav = navForRole(user?.role ?? null);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  if (variant === "marketing") {
    return (
      <header className="sticky top-0 z-40 border-b border-border bg-header/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10 xl:px-12">
          <Link href="/" className="shrink-0" aria-label="Cornerman home">
            <BrandLogo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* One anchor only — the landing page is a single scroll, and a second
                link to a neighbouring section reads as a second page that repeats it. */}
            <a
              href="#how-it-works"
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-foreground sm:inline-flex"
            >
              How it works
            </a>
            <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
            <ThemeToggle />
            <Link
              href="/login"
              className="btn-lift inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg transition hover:opacity-90"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-header/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10 xl:px-12">
        <Link
          href={
            user
              ? user.role === "manager"
                ? "/coach/manager"
                : "/coach"
              : "/"
          }
          className="shrink-0"
          aria-label="Cornerman home"
        >
          <BrandLogo />
        </Link>

        <div className="flex items-center gap-1">
          {nav.map((item) => {
            const Icon = NAV_ICONS[item.href];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 lg:inline-flex ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-accent-soft hover:text-foreground"
                }`}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {item.label}
              </Link>
            );
          })}
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-accent-soft hover:text-foreground disabled:opacity-50 lg:inline-flex"
            >
              {signingOut ? "…" : "Sign out"}
            </button>
          ) : null}
          <div className="mx-1 hidden h-4 w-px bg-border lg:block" />
          <ThemeToggle />
        </div>
      </div>

      {/* Below lg the nav moves under the bar so five labels never truncate. */}
      <nav className="mx-auto flex w-full max-w-[1800px] flex-wrap gap-1 px-4 pb-3 text-xs sm:px-6 lg:hidden">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-accent-soft hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {user ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md px-2.5 py-1 font-medium text-muted transition hover:bg-accent-soft hover:text-foreground"
          >
            Sign out
          </button>
        ) : null}
      </nav>
    </header>
  );
}
