import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { authSecretKey } from "@/lib/auth-secret";
import { findDemoAccount } from "@/data/users";
import type { Role } from "@/lib/auth-types";

async function readUser(
  req: NextRequest,
): Promise<{ email: string; role: Role } | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecretKey());
    const email = String(payload.email ?? "");
    const role = payload.role as Role;
    const account = findDemoAccount(email);
    if (!account || account.role !== role) return null;
    return { email: account.email, role: account.role };
  } catch {
    return null;
  }
}

const EMPLOYEE_ONLY = [
  "/coach/learn",
  "/coach/training",
  "/coach/practice",
];
const MANAGER_ONLY = [
  "/coach/manager",
  "/coach/playbook",
  "/coach/health",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public, always show /login (even if already signed in) so demos can
  // switch employee/manager accounts without the page "disappearing."
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const user = await readUser(req);

  // APIs (except auth): require session
  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Coach app: require session
  if (pathname.startsWith("/coach")) {
    if (!user) {
      const login = new URL("/login", req.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }

    // Exact /coach is employee diagnosis
    if (pathname === "/coach" || pathname === "/coach/") {
      if (user.role === "manager") {
        return NextResponse.redirect(new URL("/coach/manager", req.url));
      }
      return NextResponse.next();
    }

    if (EMPLOYEE_ONLY.some((p) => pathname.startsWith(p))) {
      if (user.role !== "employee") {
        return NextResponse.redirect(new URL("/coach/manager", req.url));
      }
    }

    if (MANAGER_ONLY.some((p) => pathname.startsWith(p))) {
      if (user.role !== "manager") {
        return NextResponse.redirect(new URL("/coach", req.url));
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
