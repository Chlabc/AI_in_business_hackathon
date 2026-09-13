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
      , a sales rep at <span className="font-medium text-foreground">
        {FIRM.name}
      </span>
      . It sells a workflow tool at{" "}
      <span className="font-medium text-foreground">
        ${FIRM.standardPermFeePct} per seat per month
      </span>
      , and reps aren&apos;t allowed to go below{" "}
      <span className="font-medium text-foreground">
        ${FIRM.feeFloorPct}
      </span>{" "}
      without approval. The calls below are your recent outcomes.
    </div>
  );
}
