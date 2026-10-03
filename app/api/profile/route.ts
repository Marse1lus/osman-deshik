import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { currentUser, toPublic, updateDb } from "@/lib/db";
import type { Gender } from "@/lib/types";

export const dynamic = "force-dynamic";

const phoneRe = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    fullName?: string;
    gender?: Gender;
    city?: string;
    phone?: string;
    telegram?: string;
    currentPassword?: string;
    nextPassword?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });

  const fullName = body.fullName?.trim() || "";
  const city = body.city?.trim() || "";
  const phone = body.phone?.trim() || "";
  const telegram = body.telegram?.trim().replace(/^@/, "") || "";
  if (fullName.length < 2 || fullName.length > 80) {
    return NextResponse.json({ error: "ФИО — от 2 до 80 символов." }, { status: 400 });
  }
  if (body.gender !== "Мужской" && body.gender !== "Женский") {
    return NextResponse.json({ error: "Укажите пол." }, { status: 400 });
  }
  if (!city || city.length > 64) return NextResponse.json({ error: "Укажите город." }, { status: 400 });
  if (!phoneRe.test(phone)) return NextResponse.json({ error: "Укажите верный номер телефона." }, { status: 400 });
  if (telegram && (telegram.length < 5 || telegram.length > 32)) {
    return NextResponse.json({ error: "Telegram: от 5 до 32 символов." }, { status: 400 });
  }

  let nextHash: { hash: string; salt: string } | null = null;
  if (body.nextPassword) {
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, user.passwordSalt, user.passwordHash))) {
      return NextResponse.json({ error: "Текущий пароль неверный." }, { status: 400 });
    }
    if (body.nextPassword.length < 8) {
      return NextResponse.json({ error: "Новый пароль — минимум 8 символов." }, { status: 400 });
    }
    nextHash = await hashPassword(body.nextPassword);
  }

  const saved = await updateDb((db) => {
    const row = db.users.find((item) => item.id === user.id);
    if (!row) return null;
    row.profile = { ...row.profile, fullName, gender: body.gender as Gender, city, phone, telegram };
    if (nextHash) {
      row.passwordHash = nextHash.hash;
      row.passwordSalt = nextHash.salt;
    }
    return row;
  });

  if (!saved) return NextResponse.json({ error: "Аккаунт не найден." }, { status: 404 });
  return NextResponse.json({ user: toPublic(saved) });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти." }, { status: 401 });
  if (user.role === "admin") {
    return NextResponse.json({ error: "Аккаунт администратора удалять нельзя." }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !(await verifyPassword(body.password, user.passwordSalt, user.passwordHash))) {
    return NextResponse.json({ error: "Пароль неверный." }, { status: 400 });
  }
  await updateDb((db) => {
    db.users = db.users.filter((item) => item.id !== user.id);
    db.votes = db.votes.filter((item) => item.userId !== user.id);
  });
  return NextResponse.json({ ok: true });
}
