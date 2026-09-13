import { NextResponse } from "next/server";
import { findDemoAccount, defaultPathForRole } from "@/data/users";
import { sessionCookieOptions, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  // Demo auth: any non-empty password is accepted for allowlisted emails.
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const account = findDemoAccount(email);
  if (!account) {
    return NextResponse.json(
      {
        error:
          "Unrecognized work email. For the demo, use an employee or manager address from the note below the form.",
      },
      { status: 401 },
    );
  }

  const user = {
    email: account.email,
    name: account.name,
    role: account.role,
    repId: account.repId,
  };
  const token = await signSession(user);
  const res = NextResponse.json({
    user,
    redirectTo: defaultPathForRole(account.role),
  });
  const cookie = sessionCookieOptions(token);
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  return res;
}
