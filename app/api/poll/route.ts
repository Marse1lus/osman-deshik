import { NextResponse } from "next/server";
import { clientIp } from "@/lib/auth";
import { currentUser, pollClosed, readDb, updateDb } from "@/lib/db";
import { revoteLeft } from "@/lib/text";
import { safePhoto } from "@/lib/photo";
import type { Limits, Poll, VoteAnswers } from "@/lib/types";

export const dynamic = "force-dynamic";

function resultsOf(poll: Poll, votes: { userId: string; answers: VoteAnswers }[], userId?: string) {
  return poll.nominations.map((nomination) => {
    const counts = new Map(nomination.options.map((option) => [option.id, 0]));
    for (const vote of votes) {
      for (const optionId of vote.answers[nomination.id] || []) {
        if (counts.has(optionId)) counts.set(optionId, (counts.get(optionId) || 0) + 1);
      }
    }
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    const mine = votes.find((vote) => vote.userId === userId);
    return {
      id: nomination.id,
      title: nomination.title,
      description: nomination.description,
      total,
      myChoices: mine?.answers[nomination.id] || [],
      options: nomination.options.map((option) => {
        const votesCount = counts.get(option.id) || 0;
        return {
          ...option,
          votes: votesCount,
          percentage: total ? Math.round((votesCount / total) * 1000) / 10 : 0,
        };
      }),
    };
  });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти." }, { status: 401 });
  const db = await readDb();
  const myVote = db.votes.find((vote) => vote.userId === user.id) || null;
  return NextResponse.json({
    poll: db.poll,
    closed: pollClosed(db),
    ballots: db.votes.length,
    myVote: myVote ? { answers: myVote.answers, updatedAt: myVote.updatedAt } : null,
    sections: resultsOf(db.poll, db.votes, user.id),
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { answers?: VoteAnswers; deviceId?: string } | null;
  const answers = body?.answers || {};
  const deviceId = (body?.deviceId || "").slice(0, 80);
  const ip = clientIp(req);

  const saved = await updateDb((db) => {
    if (pollClosed(db)) return { error: "Голосование уже завершено.", status: 403 };
    const now = Date.now();
    const existing = db.votes.find((vote) => vote.userId === user.id);
    const recent = (existing?.submissions || []).filter((iso) => now - new Date(iso).getTime() < 30 * 60 * 1000);
    if (recent.length >= db.limits.maxSubmissionsPer30Min) {
      return {
        error: "Вы уже отправляли голос слишком часто. Повторить можно через 30 минут.",
        status: 429,
      };
    }

    if (!existing) {
      const ipUsers = new Set(db.votes.filter((vote) => vote.ip === ip).map((vote) => vote.userId));
      if (ipUsers.size >= db.limits.maxAccountsPerIp) {
        return { error: "С этого адреса уже подано максимальное число голосов.", status: 429 };
      }
      if (deviceId) {
        const deviceUsers = new Set(db.votes.filter((vote) => vote.deviceId === deviceId).map((vote) => vote.userId));
        if (deviceUsers.size >= db.limits.maxAccountsPerDevice) {
          return { error: "С этого устройства уже подано максимальное число голосов.", status: 429 };
        }
      }
    }

    const clean: VoteAnswers = {};
    for (const nomination of db.poll.nominations) {
      const picked = Array.isArray(answers[nomination.id]) ? answers[nomination.id] : [];
      const unique = [...new Set(picked)].filter((id) => nomination.options.some((option) => option.id === id));
      if (!unique.length) return { error: `Выберите вариант в номинации «${nomination.title}».`, status: 400 };
      if (unique.length > nomination.maxChoices) {
        return { error: `В номинации «${nomination.title}» можно выбрать не более ${nomination.maxChoices}.`, status: 400 };
      }
      clean[nomination.id] = unique;
    }

    const stamp = new Date().toISOString();
    if (existing && revoteLeft(existing.updatedAt, now) > 0) {
      return { error: "Переголосовать можно через 48 часов после предыдущего голоса.", status: 429 };
    }

    if (existing) {
      existing.answers = clean;
      existing.updatedAt = stamp;
      existing.ip = ip;
      existing.deviceId = deviceId || existing.deviceId;
      existing.submissions = [...recent, stamp];
    } else {
      db.votes.push({
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: stamp,
        updatedAt: stamp,
        ip,
        deviceId,
        answers: clean,
        submissions: [stamp],
      });
    }
    return { error: "", status: 200 };
  });

  if (saved.error) return NextResponse.json({ error: saved.error }, { status: saved.status });
  return NextResponse.json({ ok: true });
}

function cleanPoll(input: Poll): Poll | string {
  const title = input.title?.trim() || "";
  const subtitle = input.subtitle?.trim() || "";
  if (title.length < 2 || title.length > 80) return "Название голосования — от 2 до 80 символов.";
  if (!input.nominations?.length) return "Добавьте хотя бы одну номинацию.";
  const nominations = input.nominations.map((nomination) => {
    const options = (nomination.options || [])
      .map((option) => ({
        id: option.id || crypto.randomUUID(),
        title: option.title?.trim() || "",
        subtitle: option.subtitle?.trim() || "",
        photo: safePhoto(option.photo),
      }))
      .filter((option) => option.title);
    return {
      id: nomination.id || crypto.randomUUID(),
      title: nomination.title?.trim() || "",
      description: nomination.description?.trim() || "",
      maxChoices: Number(nomination.maxChoices) || 1,
      options,
    };
  });
  for (const nomination of nominations) {
    if (nomination.title.length < 2) return "У каждой номинации должно быть название.";
    if (nomination.options.length < 2) return `В номинации «${nomination.title}» нужно минимум два участника.`;
    if (nomination.maxChoices < 1 || nomination.maxChoices > nomination.options.length) {
      return `В номинации «${nomination.title}» неверно указано число вариантов.`;
    }
  }
  let deadline: string | null = null;
  if (input.deadline) {
    const time = new Date(input.deadline);
    if (Number.isNaN(time.getTime())) return "Некорректная дата окончания.";
    deadline = time.toISOString();
  }
  return { title, subtitle, deadline, nominations };
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { poll?: Poll; limits?: Limits } | null;
  if (!body?.poll || !body.limits) return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const poll = cleanPoll(body.poll);
  if (typeof poll === "string") return NextResponse.json({ error: poll }, { status: 400 });
  const limits: Limits = {
    maxAccountsPerIp: Math.min(100, Math.max(1, Number(body.limits.maxAccountsPerIp) || 1)),
    maxAccountsPerDevice: Math.min(100, Math.max(1, Number(body.limits.maxAccountsPerDevice) || 1)),
    maxSubmissionsPer30Min: Math.min(20, Math.max(1, Number(body.limits.maxSubmissionsPer30Min) || 1)),
  };
  await updateDb((db) => {
    db.poll = poll;
    db.limits = limits;
    const valid = new Map(poll.nominations.map((nomination) => [nomination.id, new Set(nomination.options.map((option) => option.id))]));
    for (const vote of db.votes) {
      const next: VoteAnswers = {};
      for (const [nominationId, optionIds] of Object.entries(vote.answers)) {
        const allowed = valid.get(nominationId);
        if (!allowed) continue;
        const kept = optionIds.filter((id) => allowed.has(id));
        if (kept.length) next[nominationId] = kept;
      }
      vote.answers = next;
    }
  });
  return NextResponse.json({ ok: true });
}
