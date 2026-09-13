import { NextResponse } from "next/server";
import { findDemoAccount, defaultPathForRole } from "@/data/users";
import { sessionCookieOptions, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const account = findDemoAccount(email);
  if (!account) {
    return NextResponse.json(
      {
        error:
          "Unrecognized email. Use alex@northline.demo or jordan@northline.demo.",
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
