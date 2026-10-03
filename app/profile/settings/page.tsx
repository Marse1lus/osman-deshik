"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Cabinet, useUser } from "@/components/Cabinet";
import { Field, Modal, PasswordInput } from "@/components/ui";
import { api, uploadPhoto } from "@/lib/client";
import { maskPhone } from "@/lib/text";
import type { Gender, PublicUser } from "@/lib/types";

type SettingsTab = "profile" | "password" | "delete";

function SettingsForm() {
  const user = useUser();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("Мужской");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<SettingsTab>("profile");

  function openTab(next: SettingsTab) {
    setTab(next);
    setError("");
    setMessage("");
  }

  useEffect(() => {
    if (!user) return;
    setFullName(user.profile.fullName);
    setGender(user.profile.gender);
    setCity(user.profile.city);
    setPhone(user.profile.phone);
    setTelegram(user.profile.telegram);
    setPhoto(user.profile.photo || "");
  }, [user]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError("");
    setMessage("");
    setUploading(true);
    try {
      const url = await uploadPhoto(file, { purpose: "avatar" });
      setPhoto(url);
      window.dispatchEvent(new Event("od-profile"));
      setMessage("Фото обновлено.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить фото.");
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    try {
      await api<{ user: PublicUser }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName, gender, city, phone, telegram }),
      });
      setMessage("Данные сохранены.");
      window.dispatchEvent(new Event("od-profile"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить.");
    } finally {
      setPending(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!currentPassword) return setError("Введите текущий пароль.");
    if (nextPassword.length < 8) return setError("Минимум 8 символов.");
    if (nextPassword !== confirm) return setError("Пароли не совпадают.");
    setPending(true);
    try {
      await api<{ user: PublicUser }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName,
          gender,
          city,
          phone,
          telegram,
          currentPassword,
          nextPassword,
        }),
      });
      setMessage("Пароль изменён.");
      setCurrentPassword("");
      setNextPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сменить пароль.");
    } finally {
      setPending(false);
    }
  }

  async function removeAccount() {
    setError("");
    try {
      await api("/api/profile", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) });
      await api("/api/auth", { method: "DELETE" });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить аккаунт.");
    }
  }

  if (!user) return null;

  return (
    <>
      <h1 className="page-title">Настройки</h1>
      <p className="page-lead">Личные данные, пароль и аккаунт.</p>
      <section className="card">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" className={tab === "profile" ? "on" : ""} aria-selected={tab === "profile"} onClick={() => openTab("profile")}>
            Личные данные
          </button>
          <button type="button" role="tab" className={tab === "password" ? "on" : ""} aria-selected={tab === "password"} onClick={() => openTab("password")}>
            Смена пароля
          </button>
          {user.role !== "admin" ? (
            <button type="button" role="tab" className={tab === "delete" ? "on" : ""} aria-selected={tab === "delete"} onClick={() => openTab("delete")}>
              Удаление аккаунта
            </button>
          ) : null}
        </div>
        {error ? <div className="alert">{error}</div> : null}
        {message ? <div className="note">{message}</div> : null}
        {tab === "profile" ? (
          <form onSubmit={saveProfile}>
            <div className="settings-photo">
              <label className="photo-pick big">
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
              <div>
                <b>Фото профиля</b>
                <p className="muted">Оно появится внизу меню. JPG, PNG, WEBP или GIF, до 15 МБ.</p>
              </div>
            </div>
            <Field label="ФИО">
              <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </Field>
            <Field label="Пол">
              <select className="select" value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
                <option>Мужской</option>
                <option>Женский</option>
              </select>
            </Field>
            <Field label="Город">
              <input className="input" value={city} onChange={(event) => setCity(event.target.value)} />
            </Field>
            <Field label="Телефон">
              <input className="input" value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))} />
            </Field>
            <Field label="Telegram">
              <input className="input" value={telegram} onChange={(event) => setTelegram(event.target.value)} />
            </Field>
            <button className="btn" type="submit" disabled={pending} style={{ maxWidth: 240 }}>
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </form>
        ) : null}
        {tab === "password" ? (
          <form onSubmit={savePassword}>
            <Field label="Текущий пароль">
              <PasswordInput value={currentPassword} onChange={setCurrentPassword} placeholder="Текущий пароль" autoComplete="current-password" />
            </Field>
            <Field label="Новый пароль">
              <PasswordInput value={nextPassword} onChange={setNextPassword} placeholder="Минимум 8 символов" autoComplete="new-password" />
            </Field>
            <Field label="Подтвердите пароль">
              <PasswordInput value={confirm} onChange={setConfirm} placeholder="Повторите пароль" autoComplete="new-password" />
            </Field>
            <button className="btn" type="submit" disabled={pending} style={{ maxWidth: 240 }}>
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </form>
        ) : null}
        {tab === "delete" && user.role !== "admin" ? (
          <div>
            <p className="muted">Вместе с аккаунтом удалится и ваш голос. Это нельзя отменить.</p>
            <button className="btn danger" type="button" style={{ maxWidth: 240 }} onClick={() => setRemoving(true)}>
              Удалить
            </button>
          </div>
        ) : null}
      </section>
      {removing ? (
        <Modal title="Удалить аккаунт?" text="Это действие нельзя отменить." onClose={() => setRemoving(false)}>
          <Field label="Пароль">
            <PasswordInput value={deletePassword} onChange={setDeletePassword} placeholder="Пароль" />
          </Field>
          <div className="btn-row">
            <button className="btn ghost" type="button" onClick={() => setRemoving(false)}>Отмена</button>
            <button className="btn danger" type="button" onClick={removeAccount}>Удалить</button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export default function SettingsPage() {
  return (
    <Cabinet>
      <SettingsForm />
    </Cabinet>
  );
}
