import { NextResponse } from "next/server";
import { clientIp, hashPassword, tooMany } from "@/lib/auth";
import { updateDb } from "@/lib/db";
import { mailConfigured, sendResetCode } from "@/lib/mail";

export const dynamic = "force-dynamic";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (tooMany(`reset:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много запросов. Подождите 15 минут." }, { status: 429 });
  }

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

  if (!devCode) {
    return NextResponse.json({ ok: true, message: "Если аккаунт с таким email есть, код уже отправлен на почту." });
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true, devCode, message: "Код создан для локальной проверки." });
  }

  if (!mailConfigured()) {
    return NextResponse.json({ error: "Отправка писем ещё не настроена. Напишите организатору." }, { status: 503 });
  }

  try {
    await sendResetCode(email, devCode);
  } catch {
    return NextResponse.json({ error: "Не удалось отправить письмо. Попробуйте ещё раз позже." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "Код отправлен на почту. Проверьте входящие и папку «Спам»." });
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
