import { NextResponse } from "next/server";
import { clientIp, sessionCookie, signSession, tooMany, hashPassword } from "@/lib/auth";
import { toPublic, updateDb } from "@/lib/db";
import { safePhoto } from "@/lib/photo";
import type { Gender } from "@/lib/types";

export const dynamic = "force-dynamic";

const phoneRe = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (tooMany(`register:${ip}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много регистраций с этого адреса. Попробуйте позже." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
    fullName?: string;
    gender?: Gender;
    city?: string;
    phone?: string;
    telegram?: string;
    age?: string;
    photo?: string;
    consent?: boolean;
  } | null;

  if (!body) return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";
  const fullName = body.fullName?.trim() || "";
  const city = body.city?.trim() || "";
  const phone = body.phone?.trim() || "";
  const telegram = body.telegram?.trim().replace(/^@/, "") || "";
  const age = body.age || "";
  const gender = body.gender;

  if (age === "under18") {
    return NextResponse.json({ error: "Вам должно быть больше 18 лет." }, { status: 400 });
  }
  if (!age) return NextResponse.json({ error: "Укажите ваш возраст." }, { status: 400 });
  if (fullName.length < 2 || fullName.length > 80) {
    return NextResponse.json({ error: "Напишите ФИО — от 2 до 80 символов." }, { status: 400 });
  }
  if (gender !== "Мужской" && gender !== "Женский") {
    return NextResponse.json({ error: "Укажите пол." }, { status: 400 });
  }
  if (!city || city.length > 64) return NextResponse.json({ error: "Укажите город." }, { status: 400 });
  if (!phoneRe.test(phone)) return NextResponse.json({ error: "Укажите верный номер телефона." }, { status: 400 });
  if (telegram && (telegram.length < 5 || telegram.length > 32)) {
    return NextResponse.json({ error: "Telegram: от 5 до 32 символов." }, { status: 400 });
  }
  if (!emailRe.test(email)) return NextResponse.json({ error: "Введите корректный email." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Пароль — минимум 8 символов." }, { status: 400 });
  if (!body.consent) return NextResponse.json({ error: "Нужно согласие на обработку данных." }, { status: 400 });

  const passwordData = await hashPassword(password);
  const created = await updateDb((db) => {
    if (db.users.some((user) => user.email === email)) return null;
    const user = {
      id: crypto.randomUUID(),
      email,
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      role: "user" as const,
      createdAt: new Date().toISOString(),
      profile: { fullName, gender, city, phone, telegram, age, photo: safePhoto(body.photo) },
    };
    db.users.push(user);
    return user;
  });

  if (!created) return NextResponse.json({ error: "Аккаунт с таким email уже есть." }, { status: 409 });

  const res = NextResponse.json({ user: toPublic(created) });
  const cookie = sessionCookie(signSession(created.id));
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
