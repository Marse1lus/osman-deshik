"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cabinet, useUser } from "@/components/Cabinet";
import { RoundPhoto } from "@/components/RoundPhoto";
import { Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { deviceId, formatCountdown, formatDate, revoteLeft, votesLabel } from "@/lib/text";
import type { Nomination, Poll, PollOption, VoteAnswers } from "@/lib/types";

type Section = {
  id: string;
  title: string;
  total: number;
  myChoices: string[];
  options: Array<PollOption & { votes: number; percentage: number }>;
};

type Payload = {
  poll: Poll;
  closed: boolean;
  ballots: number | null;
  myVote: { answers: VoteAnswers; updatedAt: string } | null;
  sections: Section[];
};

function VoteWizard() {
  const user = useUser();
  const [data, setData] = useState<Payload | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<VoteAnswers>({});
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [revising, setRevising] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    api<Payload>("/api/poll")
      .then((payload) => {
        setData(payload);
        if (payload.myVote) setAnswers(payload.myVote.answers);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось открыть голосование."));
  }, []);

  if (!data) return <div className="center">{error || "Загрузка…"}</div>;
  if (data.closed) {
    return <EndedNotice deadline={data.poll.deadline} admin={user?.role === "admin"} />;
  }

  if (data.myVote && !revising) {
    const picks = data.poll.nominations.map((nomination) => {
      const ids = data.myVote?.answers[nomination.id] || [];
      const names = nomination.options.filter((option) => ids.includes(option.id)).map((option) => option.title);
      return { title: nomination.title, names };
    });
    const sections = data.sections || [];
    return (
      <div className="vote-wrap">
        <section className="card">
          <h1 className="page-title vote-done">
            Ваш голос учтён
            <span className="check-badge" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5.5 11.4 9.1 15 16.5 7" stroke="#178a45" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </h1>
          <p className="page-lead">Бюллетень скрыт. Изменить выбор можно через 48 часов, пока приём голосов открыт.</p>
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
          {!data.closed ? (
            <RevoteButton updatedAt={data.myVote.updatedAt} now={now} onRevote={() => { setStep(0); setError(""); setRevising(true); }} />
          ) : null}
        </section>
        <h2 className="page-title" style={{ textAlign: "center", marginTop: 28 }}>Результаты голосования</h2>
        <p className="page-lead" style={{ textAlign: "center" }}>
          {data.poll.title}{typeof data.ballots === "number" ? ` ${votesLabel(data.ballots)}.` : ""}
        </p>
        {sections.map((section, index) => (
          <section className="section" key={section.id}>
            <h3>{index + 1}. {section.title}</h3>
            <div className="bars">
              {section.options.map((option) => (
                <div key={option.id} className={section.myChoices.includes(option.id) ? "bar mine" : "bar"}>
                  <div className="bar-fill" style={{ width: `${option.percentage}%` }} />
                  <RoundPhoto src={option.photo} name={option.title} size={52} />
                  <div className="bar-name">
                    {option.title}
                    <small>{votesLabel(option.votes)}{section.myChoices.includes(option.id) ? " · ваш выбор" : ""}</small>
                  </div>
                  <b>{option.percentage}%</b>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const nomination = data.poll.nominations[step] as Nomination | undefined;
  if (!nomination) return <div className="card">Номинации ещё не добавлены. Это делает администратор.</div>;
  const picked = answers[nomination.id] || [];
  const last = step === data.poll.nominations.length - 1;

  const toggle = (optionId: string) => {
    setAnswers((prev) => {
      const current = prev[nomination.id] || [];
      if (nomination.maxChoices === 1) return { ...prev, [nomination.id]: [optionId] };
      if (current.includes(optionId)) return { ...prev, [nomination.id]: current.filter((id) => id !== optionId) };
      if (current.length >= nomination.maxChoices) return prev;
      return { ...prev, [nomination.id]: [...current, optionId] };
    });
  };

  const finish = async () => {
    setPending(true);
    setError("");
    try {
      await api("/api/poll", {
        method: "POST",
        body: JSON.stringify({ answers, deviceId: deviceId() }),
      });
      const fresh = await api<Payload>("/api/poll");
      setData(fresh);
      if (fresh.myVote) setAnswers(fresh.myVote.answers);
      setRevising(false);
      setConfirm(false);
      setStep(0);
    } catch (err) {
      setConfirm(false);
      setError(err instanceof Error ? err.message : "Не удалось сохранить голос.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="vote-wrap">
      <div className="vote-top">
        <span className="step-label">Шаг {step + 1} из {data.poll.nominations.length}</span>
      </div>
      <div className="steps" style={{ marginTop: 14, marginBottom: 16 }}>
        {data.poll.nominations.map((item, index) => (
          <span key={item.id} className={index <= step ? "on" : ""} />
        ))}
      </div>
      <section className="card">
        <p className="muted" style={{ marginTop: 0 }}>{data.poll.title}</p>
        <h1 className="page-title">{nomination.title}</h1>
        <p className="page-lead">
          {nomination.description || "Выберите вариант."}
          {nomination.maxChoices > 1 ? ` Можно выбрать не более ${nomination.maxChoices} вариантов.` : ""}
        </p>
        {error ? <div className="alert">{error}</div> : null}
        {nomination.options.map((option) => {
          const selected = picked.includes(option.id);
          return (
            <button key={option.id} type="button" className={selected ? "option selected" : "option"} onClick={() => toggle(option.id)}>
              <RoundPhoto src={option.photo} name={option.title} size={84} />
              <span className="option-text">
                <b>{option.title}</b>
                {option.subtitle ? <small>{option.subtitle}</small> : null}
              </span>
              <i className="radio" />
            </button>
          );
        })}
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button
            className="btn ghost"
            type="button"
            disabled={step === 0 && !data.myVote}
            onClick={() => {
              if (step === 0) setRevising(false);
              else setStep((value) => value - 1);
            }}
          >
            Назад
          </button>
          {last ? (
            <button className="btn" type="button" disabled={!picked.length} onClick={() => setConfirm(true)}>
              Закончить
            </button>
          ) : (
            <button className="btn" type="button" disabled={!picked.length} onClick={() => setStep((value) => value + 1)}>
              Продолжить
            </button>
          )}
        </div>
      </section>
      {confirm ? (
        <Modal
          title="Завершить голосование?"
          text="Голос сохранится. Изменить его можно через 48 часов, пока голосование открыто."
          onClose={() => setConfirm(false)}
        >
          <div className="btn-row">
            <button className="btn ghost" type="button" onClick={() => setConfirm(false)}>Отмена</button>
            <button className="btn" type="button" disabled={pending} onClick={finish}>{pending ? "Сохраняем…" : "Завершить"}</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function EndedNotice({ deadline, admin }: { deadline: string | null; admin: boolean }) {
  const date = deadline ? new Date(deadline) : null;
  const valid = Boolean(date && !Number.isNaN(date.getTime()));
  const hours = valid ? date!.getHours() : 0;
  const minutes = valid ? date!.getMinutes() : 0;
  const time = valid
    ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date!)
    : "";

  return (
    <div className="vote-wrap">
      <section className="card ended">
        <h1 className="page-title">Время голосования закончилось</h1>
        <p className="page-lead">Новые голоса больше не принимаются.</p>
        <div className="clock">
          <div className="clock-face" aria-hidden="true">
            <span className="tick t12">12</span>
            <span className="tick t3">3</span>
            <span className="tick t6">6</span>
            <span className="tick t9">9</span>
            <span className="hand hour" style={{ transform: `rotate(${((hours % 12) + minutes / 60) * 30}deg)` }} />
            <span className="hand minute" style={{ transform: `rotate(${minutes * 6}deg)` }} />
            <i />
          </div>
          {valid ? <b>{time}</b> : null}
          {valid && deadline ? <span>{formatDate(deadline)}</span> : null}
        </div>
        {admin ? (
          <Link className="btn" href="/vote/results">Результаты</Link>
        ) : null}
      </section>
    </div>
  );
}

function RevoteButton({ updatedAt, now, onRevote }: { updatedAt: string; now: number; onRevote: () => void }) {
  const left = revoteLeft(updatedAt, now);
  return (
    <div style={{ marginTop: 16 }}>
      <button className="btn revote-btn" type="button" disabled={left > 0} onClick={onRevote}>
        {left > 0 ? `Хотите переголосовать? ${formatCountdown(left)}` : "Хотите переголосовать?"}
      </button>
    </div>
  );
}

export default function VotePage() {
  return (
    <Cabinet>
      <VoteWizard />
    </Cabinet>
  );
}
