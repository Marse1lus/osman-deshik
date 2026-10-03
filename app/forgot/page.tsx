"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Field } from "@/components/ui";
import { api } from "@/lib/client";

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await api<{ devCode?: string }>("/api/password", { method: "POST", body: JSON.stringify({ email }) });
      sessionStorage.setItem("reset-email", email.trim().toLowerCase());
      if (data.devCode) sessionStorage.setItem("reset-code", data.devCode);
      else sessionStorage.removeItem("reset-code");
      router.push("/reset-password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить код.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Восстановление" subtitle="Укажите email, и мы создадим код для нового пароля." footer={<Link className="link" href="/login">Вернуться ко входу</Link>}>
      <form onSubmit={submit}>
        {error ? <div className="alert">{error}</div> : null}
        <Field label="Email">
          <input className="input" type="email" placeholder="Ваш email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <button className="btn" disabled={pending || !email} type="submit">{pending ? "Отправляем…" : "Получить код"}</button>
      </form>
    </AuthShell>
  );
}
