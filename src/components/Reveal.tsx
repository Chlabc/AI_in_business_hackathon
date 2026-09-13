"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  /** Stagger position within a group - 0 fires immediately, 3 is the longest wait. */
  delay?: 0 | 1 | 2 | 3;
  className?: string;
  as?: "div" | "section" | "article" | "li";
};

/**
 * Fade-and-rise on scroll.
 *
 * The element renders VISIBLE. It is only hidden ("armed") once this effect has
 * run and confirmed IntersectionObserver exists - so if JS is slow, blocked, or
 * errors, the reader still sees the content instead of a blank band. Anyone who
 * prefers reduced motion is never armed at all.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"idle" | "armed" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    // Anything already on screen at first paint stays put, no flash of hiding
    // content above the fold.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.9) return;

    setState("armed");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("in");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as;
  const stateClass =
    state === "armed" ? "reveal-armed" : state === "in" ? "reveal-in" : "";

  return (
    <Tag
      ref={ref as never}
      data-reveal=""
      data-reveal-delay={delay || undefined}
      className={`${stateClass} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
