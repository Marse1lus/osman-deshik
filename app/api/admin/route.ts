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
      return {
        id: vote.id,
        name: person?.profile.fullName || "Удалённый аккаунт",
        email: person?.email || "—",
        updatedAt: vote.updatedAt,
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
