import { NextResponse } from "next/server";
import { currentUser, pollClosed, readDb } from "@/lib/db";

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
