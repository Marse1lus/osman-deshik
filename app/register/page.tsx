"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Field, Modal, PasswordInput } from "@/components/ui";
import { api, uploadPhoto } from "@/lib/client";
import { ageOptions, maskPhone } from "@/lib/text";
import type { Gender } from "@/lib/types";

const phoneRe = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [rules, setRules] = useState(false);
  const [age, setAge] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("+7");
  const [telegram, setTelegram] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      setPhoto(await uploadPhoto(file, { purpose: "avatar" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить фото.");
    } finally {
      setUploading(false);
    }
  }

  function nextStep() {
    setError("");
    if (step === 0) {
      if (!age) return setError("Укажите ваш возраст.");
      if (age === "under18") return setError("Вам должно быть больше 18 лет.");
    }
    if (step === 1) {
      if (fullName.trim().length < 2) return setError("Напишите ваше ФИО.");
      if (!gender) return setError("Укажите пол.");
      if (!city.trim()) return setError("Из какого вы города?");
      if (!phoneRe.test(phone)) return setError("Укажите верный номер телефона.");
      if (telegram && telegram.replace(/^@/, "").length < 5) return setError("Telegram — минимум 5 символов.");
    }
    setStep((value) => value + 1);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step < 2) return nextStep();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Введите корректный email.");
    if (password.length < 8) return setError("Минимум 8 символов.");
    if (password !== confirm) return setError("Пароли не совпадают.");
    if (!consent) return setError("Нужно согласие на обработку данных.");
    setPending(true);
    try {
      await api("/api/register", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName, gender, city, phone, telegram, age, photo, consent }),
      });
      router.replace("/profile?welcome=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Создайте личный кабинет, чтобы участвовать в голосовании. Это займёт пару минут."
      step={step}
      footer={
        <>
          У вас уже есть аккаунт? <Link className="link" href="/login">Авторизуйтесь</Link>
        </>
      }
    >
      <form onSubmit={submit}>
        {error ? <div className="alert">{error}</div> : null}
        {step === 0 ? (
          <Field label="Укажите ваш возраст *">
            <select className="select" value={age} onChange={(event) => setAge(event.target.value)}>
              <option value="">Ваш возраст</option>
              {ageOptions().map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
        ) : null}
        {step === 1 ? (
          <>
            <label className="photo-pick big photo-center">
              {photo ? <img src={photo} alt="" /> : <span>{uploading ? "…" : "+"}</span>}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  void pickPhoto(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <p className="muted" style={{ textAlign: "center", marginTop: -8 }}>Фото профиля</p>
            <Field label="ФИО *">
              <input className="input" placeholder="Напишите ваше ФИО" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </Field>
            <Field label="Пол *">
              <select className="select" value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
                <option value="">Ваш пол</option>
                <option>Мужской</option>
                <option>Женский</option>
              </select>
            </Field>
            <Field label="Город *">
              <input className="input" placeholder="Москва" value={city} onChange={(event) => setCity(event.target.value)} />
            </Field>
            <Field label="Номер телефона *">
              <input className="input" inputMode="tel" placeholder="+7 (900) 000-00-00" value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))} />
            </Field>
            <Field label="Telegram">
              <input className="input" placeholder="@username" value={telegram} onChange={(event) => setTelegram(event.target.value)} />
            </Field>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Field label="Email *">
              <input className="input" type="email" placeholder="Ваш email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="Пароль *">
              <PasswordInput value={password} onChange={setPassword} placeholder="Придумайте пароль" autoComplete="new-password" />
            </Field>
            <Field label="Подтвердите пароль *">
              <PasswordInput value={confirm} onChange={setConfirm} placeholder="Повторите пароль" autoComplete="new-password" />
            </Field>
            <label className="check">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>
                Я даю согласие на обработку персональных данных и принимаю{" "}
                <button className="link" type="button" onClick={() => setRules(true)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                  правила голосования
                </button>
              </span>
            </label>
          </>
        ) : null}
        <div className="btn-row">
          {step > 0 ? (
            <button className="btn ghost" type="button" onClick={() => { setError(""); setStep((value) => value - 1); }}>
              Назад
            </button>
          ) : null}
          <button className="btn" type="submit" disabled={pending}>
            {step < 2 ? "Далее" : pending ? "Создаём…" : "Создать аккаунт"}
          </button>
        </div>
      </form>
      {rules ? (
        <Modal title="Правила голосования" onClose={() => setRules(false)}>
          <p>Голосовать можно с 18 лет. Один аккаунт — один голос, его можно изменить, пока приём голосов открыт. Повторные голоса с одного устройства ограничены.</p>
          <button className="btn" type="button" onClick={() => setRules(false)}>Понятно</button>
        </Modal>
      ) : null}
    </AuthShell>
  );
}
