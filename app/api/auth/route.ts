import { NextResponse } from "next/server";
import { clearCookie, clientIp, sessionCookie, signSession, tooMany, verifyPassword } from "@/lib/auth";
import { currentUser, readDb, toPublic } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: toPublic(user) });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (tooMany(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много попыток входа. Подождите 15 минут." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const password = body?.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "Введите email и пароль." }, { status: 400 });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.email === email) || null;
  if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
    return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
  }

  const res = NextResponse.json({ user: toPublic(user) });
  const cookie = sessionCookie(signSession(user.id));
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const cookie = clearCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
