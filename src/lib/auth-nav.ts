import type { Role } from "@/lib/auth-types";

/** Nav links allowed for a role (desktop + mobile). Safe for client components. */
export function navForRole(
  role: Role | null,
): { href: string; label: string }[] {
  if (role === "employee") {
    // Profile · Learn · Practice · Progress, one job each.
    // Scenarios live inside Practice (picker when no ?scenario=).
    return [
      { href: "/coach", label: "Profile" },
      { href: "/coach/learn", label: "Learn" },
      { href: "/coach/practice", label: "Practice" },
      { href: "/coach/value", label: "Progress" },
    ];
  }
  if (role === "manager") {
    // /coach/health is deliberately NOT here. It and /coach/value both answer
    // "is the scoring any good?", so two nav items read as two questions.
    // Evidence is the summary and links onward to the full accuracy report.
    return [
      { href: "/coach/manager", label: "Team" },
      { href: "/coach/playbook", label: "Playbook" },
      { href: "/coach/value", label: "Evidence" },
    ];
  }
  return [{ href: "/login", label: "Sign in" }];
}
