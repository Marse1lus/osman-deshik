"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Cabinet, useUser } from "@/components/Cabinet";
import { api } from "@/lib/client";
import { formatDate, plural, votesLabel } from "@/lib/text";
import type { Poll, VoteAnswers } from "@/lib/types";

type PollPayload = {
  poll: Poll;
  closed: boolean;
  ballots: number | null;
  myVote: { answers: VoteAnswers; updatedAt: string } | null;
};

function ProfileHome() {
  const user = useUser();
  const params = useSearchParams();
  const [data, setData] = useState<PollPayload | null>(null);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    if (params.get("welcome") === "1") {
      setWelcome(true);
      window.history.replaceState(null, "", "/profile");
    }
    api<PollPayload>("/api/poll").then(setData).catch(() => setData(null));
  }, [params]);

  if (!user) return null;
  const admin = user.role === "admin";
  const voted = Boolean(data?.myVote);
  const picks = data && data.myVote
    ? data.poll.nominations.map((nomination) => {
        const ids = data.myVote?.answers[nomination.id] || [];
        const names = nomination.options.filter((option) => ids.includes(option.id)).map((option) => option.title);
        return { title: nomination.title, names };
      })
    : [];

  return (
    <>
      <h1 className="page-title">Здравствуйте, {user.profile.fullName.split(" ")[0]}</h1>
      <p className="page-lead">Личный кабинет · с {formatDate(user.createdAt)}</p>
      {welcome ? <div className="note">Аккаунт создан. Можно голосовать.</div> : null}
      <div className="grid two">
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2>{data?.poll.title || "Голосование"}</h2>
            <span className={data?.closed ? "badge closed" : voted ? "badge" : "badge wait"}>
              {data?.closed ? "Завершено" : voted ? "Голос учтён" : "Вы ещё не голосовали"}
            </span>
          </div>
          <p className="muted">{data?.poll.subtitle}</p>
          <p className="muted">
            {data
              ? `${data.poll.nominations.length} ${plural(data.poll.nominations.length, "номинация", "номинации", "номинаций")}${admin && typeof data.ballots === "number" ? ` · ${votesLabel(data.ballots)}` : ""}`
              : "Загрузка…"}
          </p>
          {picks.some((item) => item.names.length) ? (
            <dl className="kvs">
              {picks.map((item) => (
                <div key={item.title}>
                  <dt>{item.title}</dt>
                  <dd>{item.names.join(", ") || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="actions">
            {data && !data.closed ? (
              <Link className="btn" href="/vote" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
                {voted ? "Ваш голос учтён" : "Проголосовать"}
              </Link>
            ) : null}
            {admin ? (
              <Link className="btn ghost" href="/vote/results" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
                Результаты
              </Link>
            ) : null}
          </div>
        </section>
        <section className="card">
          <h2>Ваши данные</h2>
          <dl className="kvs">
            <div><dt>ФИО</dt><dd>{user.profile.fullName}</dd></div>
            <div><dt>Город</dt><dd>{user.profile.city}</dd></div>
            <div><dt>Телефон</dt><dd>{user.profile.phone}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Telegram</dt><dd>{user.profile.telegram ? `@${user.profile.telegram}` : "—"}</dd></div>
          </dl>
          <div className="actions">
            <Link className="btn ghost" href="/profile/settings" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
              Изменить
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Cabinet>
      <Suspense>
        <ProfileHome />
      </Suspense>
    </Cabinet>
  );
}
