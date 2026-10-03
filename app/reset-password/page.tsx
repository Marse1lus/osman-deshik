"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Field, PasswordInput } from "@/components/ui";
import { api } from "@/lib/client";

export default function ResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setEmail(sessionStorage.getItem("reset-email") || "");
    setCode(sessionStorage.getItem("reset-code") || "");
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError("Минимум 8 символов.");
    if (password !== confirm) return setError("Пароли не совпадают.");
    setPending(true);
    setError("");
    try {
      await api("/api/password", { method: "PUT", body: JSON.stringify({ email, code, password }) });
      sessionStorage.removeItem("reset-code");
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сменить пароль.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Новый пароль" subtitle="Введите код и придумайте новый пароль." footer={<Link className="link" href="/login">Вернуться ко входу</Link>}>
      <form onSubmit={submit}>
        {error ? <div className="alert">{error}</div> : null}
        {code ? <div className="note">Код для локальной проверки: {code}. В рабочей версии он уходит на почту.</div> : null}
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Код">
          <input className="input" inputMode="numeric" placeholder="6 цифр" value={code} onChange={(event) => setCode(event.target.value)} />
        </Field>
        <Field label="Новый пароль">
          <PasswordInput value={password} onChange={setPassword} placeholder="Придумайте пароль" autoComplete="new-password" />
        </Field>
        <Field label="Подтвердите пароль">
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Повторите пароль" autoComplete="new-password" />
        </Field>
        <button className="btn" type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить пароль"}</button>
      </form>
    </AuthShell>
  );
}
