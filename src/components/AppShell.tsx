import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-types";

type AppShellProps = {
  children: React.ReactNode;
  /** Optional right-side header slot (e.g. share status) */
  headerExtra?: React.ReactNode;
  /** Force a user (tests); otherwise reads session cookie. */
  user?: SessionUser | null;
  variant?: "app" | "marketing";
};

/**
 * Full-bleed coaching shell - uses the viewport width with comfortable
 * padding instead of a narrow centered column.
 */
export async function AppShell({
  children,
  headerExtra,
  user: userProp,
  variant,
}: AppShellProps) {
  const user = userProp === undefined ? await getSession() : userProp;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader user={user} variant={variant} />
      {headerExtra}
      {/* Marketing pages lay out their own full-bleed bands, so the shell gets
          out of the way, no max-width, no padding, no gap. Boxed cards inside a
          padded column is what made the landing page read as a dashboard. */}
      {variant === "marketing" ? (
        <main className="page-enter flex w-full flex-1 flex-col">{children}</main>
      ) : (
        <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:px-10 xl:px-12">
          {/* No page-enter: leftover translateY on main flattens 3D flip cards. */}
          {children}
        </main>
      )}
    </div>
  );
}
