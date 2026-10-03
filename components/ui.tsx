"use client";

import { useState } from "react";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <div className="hint">{error}</div> : null}
    </div>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="password">
      <input
        className="input"
        type={shown ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" className="eye" aria-label={shown ? "Скрыть пароль" : "Показать пароль"} onClick={() => setShown((value) => !value)}>
        {shown ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
            <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9.5 4.2 10.8 7-0.5 1.1-1.4 2.4-2.6 3.6M6.1 6.1C4.2 7.4 2.8 9.2 1.2 12c1.3 2.8 5.3 7 10.8 7 1.3 0 2.5-.2 3.6-.7" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Modal({
  title,
  text,
  onClose,
  children,
}: {
  title: string;
  text?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <h3>{title}</h3>
        {text ? <p className="muted">{text}</p> : null}
        {children}
      </div>
    </div>
  );
}
