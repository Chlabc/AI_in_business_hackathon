"use client";

/**
 * Compact (i) control ,  shows help text on hover / focus.
 */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="More information"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted/60 text-[10px] font-bold leading-none text-muted transition hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-56 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-foreground opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 sm:w-64"
      >
        {text}
      </span>
    </span>
  );
}
