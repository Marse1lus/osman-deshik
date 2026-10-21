import { NextResponse } from "next/server";
import { currentUser, pollClosed, readDb, updateDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  const db = await readDb();
  const voters = db.votes
    .map((vote) => {
      const person = db.users.find((item) => item.id === vote.userId);
      const ip = vote.ip || "";
      const deviceId = vote.deviceId || "";
      const answers = vote.answers;
      return {
        id: vote.id,
        userId: vote.userId,
        banned: Boolean(person?.bannedAt),
        name: person?.profile.fullName || "Удалённый аккаунт",
        email: person?.email || "—",
        city: person?.profile.city || "",
        phone: person?.profile.phone || "",
        ip,
        deviceId,
        updatedAt: vote.updatedAt,
        answers,
        sharedIp: ip ? db.votes.filter((item) => item.ip === ip).length : 1,
        sharedDevice: deviceId ? db.votes.filter((item) => item.deviceId === deviceId).length : 1,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return NextResponse.json({
    poll: db.poll,
    limits: db.limits,
    closed: pollClosed(db),
    users: db.users.length,
    voters,
  });
}

export async function POST(req: Request) {
  const admin = await currentUser();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { userId?: string; banned?: boolean } | null;
  const userId = body?.userId || "";
  if (!userId) return NextResponse.json({ error: "Не указан аккаунт." }, { status: 400 });

  const saved = await updateDb((db) => {
    const person = db.users.find((item) => item.id === userId);
    if (!person) return "Аккаунт не найден.";
    if (person.role === "admin") return "Администратора заблокировать нельзя.";
    if (body?.banned) person.bannedAt = new Date().toISOString();
    else delete person.bannedAt;
    return "";
  });
  if (saved) return NextResponse.json({ error: saved }, { status: 400 });
  return NextResponse.json({ ok: true });
}
