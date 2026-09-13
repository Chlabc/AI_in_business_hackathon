import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Optional right-side CTA (not a back-link — tabs already live in the nav). */
  action?: ReactNode;
};

/**
 * Shared top chrome for coach tabs so Profile / Learn / Practice / Progress
 * (and manager Team / Playbook / Evidence) open the same way.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-serif mt-2 text-3xl text-foreground lg:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-muted lg:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
