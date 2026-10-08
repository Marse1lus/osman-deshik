"use client";

import Link from "next/link";
import { CookieBar } from "./CookieBar";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  step,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  step?: number;
}) {
  return (
    <main className="auth">
      <div className="auth-card">
        <Link href="/login" className="logo">
          <img src="/logo.png?v=hell" alt="Hell Awards" className="logo-img" />
        </Link>
        <h1>{title}</h1>
        {subtitle ? <p className="lead">{subtitle}</p> : null}
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
        {typeof step === "number" ? (
          <div className="steps" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <span key={item} className={item <= step ? "on" : ""} />
            ))}
          </div>
        ) : null}
        <p className="owner">Сайт принадлежит Virginia group</p>
      </div>
      <CookieBar />
    </main>
  );
}
