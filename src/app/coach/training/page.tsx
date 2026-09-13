import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Scenarios merged into Practice — keep URL so old links still work. */
export default function TrainingPage() {
  redirect("/coach/practice");
}
