"use client";

import { useEffect, useState } from "react";
import { Cabinet, useUser } from "@/components/Cabinet";
import { Field } from "@/components/ui";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/text";
import type { Limits, Nomination, Poll } from "@/lib/types";

type AdminPayload = {
  poll: Poll;
  limits: Limits;
  users: number;
  voters: { id: string; name: string; email: string; updatedAt: string }[];
};

function toLocal(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function blankNomination(): Nomination {
  const id = crypto.randomUUID();
  return {
    id,
    title: "Новая номинация",
    description: "",
    maxChoices: 1,
      options: [
      { id: crypto.randomUUID(), title: "Участник 1", subtitle: "", photo: "" },
      { id: crypto.randomUUID(), title: "Участник 2", subtitle: "", photo: "" },
    ],
  };
}

function AdminEditor() {
  const user = useUser();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [voters, setVoters] = useState<AdminPayload["voters"]>([]);
  const [users, setUsers] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [uploadingId, setUploadingId] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    api<AdminPayload>("/api/admin")
      .then((data) => {
        setPoll(data.poll);
        setLimits(data.limits);
        setVoters(data.voters);
        setUsers(data.users);
        setDeadline(toLocal(data.poll.deadline));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Нет доступа."));
  }, [user]);

  if (!user) return null;
  if (user.role !== "admin") return <div className="card">Управление доступно только администратору.</div>;
  if (!poll || !limits) return <div className="center">{error || "Загрузка…"}</div>;

  function updateNomination(id: string, patch: Partial<Nomination>) {
    setPoll((current) => current && { ...current, nominations: current.nominations.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  async function uploadPhoto(nominationId: string, optionId: string, file: File | undefined) {
    if (!file || !poll) return;
    setError("");
    setUploadingId(optionId);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("nominationId", nominationId);
      body.append("optionId", optionId);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить фото.");
      setPoll((current) => {
        if (!current) return current;
        return {
          ...current,
          nominations: current.nominations.map((nomination) =>
            nomination.id !== nominationId
              ? nomination
              : {
                  ...nomination,
                  options: nomination.options.map((option) => (option.id === optionId ? { ...option, photo: data.url as string } : option)),
                }
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить фото.");
    } finally {
      setUploadingId("");
    }
  }

  async function save() {
    if (!poll || !limits) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await api("/api/poll", {
        method: "PUT",
        body: JSON.stringify({ poll: { ...poll, deadline: deadline || null }, limits }),
      });
      setMessage("Голосование обновлено.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Управление</h1>
      <p className="page-lead">Аккаунтов: {users}. Голосов: {voters.length}. Кружок слева от имени — фото участника или продукта. После загрузки оно сразу появляется в голосовании.</p>
      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="note">{message}</div> : null}
      <div className="editor">
        <section className="card">
          <Field label="Название">
            <input className="input" value={poll.title} onChange={(event) => setPoll({ ...poll, title: event.target.value })} />
          </Field>
          <Field label="Описание">
            <textarea className="input" rows={3} value={poll.subtitle} onChange={(event) => setPoll({ ...poll, subtitle: event.target.value })} />
          </Field>
          <Field label="Окончание">
            <div className="deadline">
              <input
                className="input"
                type="date"
                value={deadline.slice(0, 10)}
                onChange={(event) => {
                  const time = deadline.slice(11, 16) || "00:00";
                  setDeadline(event.target.value ? `${event.target.value}T${time}` : "");
                }}
              />
              <input
                className="input"
                type="time"
                value={deadline.slice(11, 16)}
                onChange={(event) => {
                  const day = deadline.slice(0, 10);
                  setDeadline(day ? `${day}T${event.target.value || "00:00"}` : "");
                }}
              />
            </div>
          </Field>
          <div className="pair">
            <Field label="Лимит аккаунтов с одного IP">
              <input className="input" type="number" min={1} value={limits.maxAccountsPerIp} onChange={(event) => setLimits({ ...limits, maxAccountsPerIp: Number(event.target.value) })} />
            </Field>
            <Field label="С устройства">
              <input className="input" type="number" min={1} value={limits.maxAccountsPerDevice} onChange={(event) => setLimits({ ...limits, maxAccountsPerDevice: Number(event.target.value) })} />
            </Field>
          </div>
        </section>
        {poll.nominations.map((nomination, index) => (
          <section className="nom" key={nomination.id}>
            <Field label={`Номинация ${index + 1}`}>
              <input className="input" value={nomination.title} onChange={(event) => updateNomination(nomination.id, { title: event.target.value })} />
            </Field>
            <Field label="Подсказка">
              <input className="input" value={nomination.description} onChange={(event) => updateNomination(nomination.id, { description: event.target.value })} />
            </Field>
            <Field label="Сколько вариантов можно выбрать">
              <input className="input" type="number" min={1} value={nomination.maxChoices} onChange={(event) => updateNomination(nomination.id, { maxChoices: Number(event.target.value) })} />
            </Field>
            {nomination.options.map((option, optionIndex) => (
              <div className="person-row" key={option.id}>
                <label className="photo-pick" title="Добавить фото">
                  {option.photo ? <img src={option.photo} alt="" /> : <span>{uploadingId === option.id ? "…" : "+"}</span>}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      uploadPhoto(nomination.id, option.id, file);
                    }}
                  />
                </label>
                <input
                  className="input"
                  value={option.title}
                  placeholder={`Участник ${optionIndex + 1}`}
                  onChange={(event) => {
                    const options = nomination.options.map((item) => (item.id === option.id ? { ...item, title: event.target.value } : item));
                    updateNomination(nomination.id, { options });
                  }}
                />
                <button
                  className="btn ghost tiny"
                  type="button"
                  onClick={() => updateNomination(nomination.id, { options: nomination.options.filter((item) => item.id !== option.id) })}
                >
                  Убрать
                </button>
              </div>
            ))}
            <div className="actions">
              <button
                className="btn ghost tiny"
                type="button"
                onClick={() => updateNomination(nomination.id, { options: [...nomination.options, { id: crypto.randomUUID(), title: "", subtitle: "", photo: "" }] })}
              >
                Добавить участника
              </button>
              <button
                className="btn ghost tiny"
                type="button"
                onClick={() => setPoll({ ...poll, nominations: poll.nominations.filter((item) => item.id !== nomination.id) })}
              >
                Удалить номинацию
              </button>
            </div>
          </section>
        ))}
        <div className="actions">
          <button className="btn ghost" type="button" style={{ maxWidth: 240 }} onClick={() => setPoll({ ...poll, nominations: [...poll.nominations, blankNomination()] })}>
            Добавить номинацию
          </button>
          <button className="btn" type="button" style={{ maxWidth: 240 }} disabled={pending} onClick={save}>
            {pending ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
        <section className="card">
          <h2>Кто проголосовал</h2>
          {voters.length === 0 ? <p className="muted">Пока никого.</p> : (
            <dl className="kvs">
              {voters.map((voter) => (
                <div key={voter.id}>
                  <dt>{voter.name}<br />{voter.email}</dt>
                  <dd>{formatDate(voter.updatedAt)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <Cabinet>
      <AdminEditor />
    </Cabinet>
  );
}
