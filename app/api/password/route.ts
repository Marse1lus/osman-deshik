import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { updateDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!emailRe.test(email)) {
    return NextResponse.json({ error: "Введите корректный email." }, { status: 400 });
  }

  const devCode = await updateDb((db) => {
    const user = db.users.find((item) => item.email === email);
    if (!user) return "";
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.resets = db.resets.filter((item) => item.email !== email);
    db.resets.push({
      email,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    return code;
  });

  return NextResponse.json({
    ok: true,
    message: "Если аккаунт с таким email есть, код для сброса уже создан.",
    devCode: process.env.NODE_ENV !== "production" ? devCode || undefined : undefined,
  });
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; code?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const code = body?.code?.trim() || "";
  const password = body?.password || "";
  if (!emailRe.test(email) || !code || password.length < 8) {
    return NextResponse.json({ error: "Проверьте email, код и новый пароль (минимум 8 символов)." }, { status: 400 });
  }

  const passwordData = await hashPassword(password);
  const ok = await updateDb((db) => {
    const reset = db.resets.find((item) => item.email === email && item.code === code);
    if (!reset || new Date(reset.expiresAt).getTime() < Date.now()) return false;
    const user = db.users.find((item) => item.email === email);
    if (!user) return false;
    user.passwordHash = passwordData.hash;
    user.passwordSalt = passwordData.salt;
    db.resets = db.resets.filter((item) => item.email !== email);
    return true;
  });

  if (!ok) return NextResponse.json({ error: "Код неверный или его срок истёк." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
