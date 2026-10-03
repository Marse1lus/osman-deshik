"use client";

import { useEffect, useState } from "react";
import { Modal } from "./ui";

export function CookieBar() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("od_cookie")) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <>
      <div className="cookies">
        <p>Мы используем cookie, чтобы сохранить вход в личный кабинет. Продолжая пользоваться сайтом, вы соглашаетесь с этим.</p>
        <div className="btn-row">
          <button className="btn ghost" type="button" onClick={() => setDetails(true)}>
            Подробнее
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              localStorage.setItem("od_cookie", "1");
              setOpen(false);
            }}
          >
            Хорошо
          </button>
        </div>
      </div>
      {details ? (
        <Modal title="О данных" onClose={() => setDetails(false)}>
          <p>
            В кабинете хранятся email, имя, город, телефон и ваш голос. Пароль сохраняется только в виде хеша. Сессия держится в cookie и нужна, чтобы не входить заново.
          </p>
          <button className="btn" type="button" onClick={() => setDetails(false)}>
            Понятно
          </button>
        </Modal>
      ) : null}
    </>
  );
}
