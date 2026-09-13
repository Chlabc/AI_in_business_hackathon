import { FIRM } from "@/data/seed";

/**
 * States firm context in one place so Northline / pricing numbers aren't
 * unexplained noise wherever call outcomes appear.
 */
export function DemoPremise({ name }: { name: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted">
      <span className="font-medium text-foreground">You&apos;re signed in as{" "}
        {name}</span>
      , a real estate agent at <span className="font-medium text-foreground">
        {FIRM.name}
      </span>
      . Its demo commission is{" "}
      <span className="font-medium text-foreground">
        {FIRM.standardPermFeePct}% commission
      </span>
      , and reps aren&apos;t allowed to go below{" "}
      <span className="font-medium text-foreground">
        {FIRM.feeFloorPct}%
      </span>{" "}
      without principal approval. Rates exclude GST; marketing is separate. These are demo call outcomes.
    </div>
  );
}
