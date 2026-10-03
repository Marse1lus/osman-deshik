"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Field, PasswordInput } from "@/components/ui";
import { api } from "@/lib/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/auth", { method: "POST", body: JSON.stringify({ email, password }) });
      const next = params.get("next") || "/profile";
      router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Вход в аккаунт"
      subtitle="Добро пожаловать! Пожалуйста, введите ваши данные"
      footer={
        <>
          У вас ещё нет аккаунта? <Link className="link" href="/register">Зарегистрируйтесь</Link>
        </>
      }
    >
      <form onSubmit={submit}>
        {error ? <div className="alert">{error}</div> : null}
        <Field label="Email">
          <input className="input" type="email" placeholder="Ваш email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Пароль">
          <PasswordInput value={password} onChange={setPassword} placeholder="Пароль" autoComplete="current-password" />
        </Field>
        <div className="row-end">
          <Link className="link" href="/forgot">Забыли пароль?</Link>
        </div>
        <button className="btn" type="submit" disabled={pending || !email || !password}>
          {pending ? "Входим…" : "Войти"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
