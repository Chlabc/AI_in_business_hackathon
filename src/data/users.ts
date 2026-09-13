import { DEMO_REP_ID } from "@/data/seed";
import type { DemoAccount } from "@/lib/auth-types";

/**
 * Sign-in accounts for the Northline workspace.
 * Email must match exactly (case-insensitive).
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "alex@northline.demo",
    name: "Alex Chen",
    role: "employee",
    repId: DEMO_REP_ID,
    fillLabel: "Alex · Employee",
  },
  {
    email: "jordan@northline.demo",
    name: "Jordan Hale",
    role: "manager",
    repId: null,
    fillLabel: "Jordan · Manager",
  },
];

export function findDemoAccount(email: string): DemoAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((a) => a.email === normalized);
}

export function defaultPathForRole(role: DemoAccount["role"]): string {
  return role === "manager" ? "/coach/manager" : "/coach";
}
