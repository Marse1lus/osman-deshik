"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { PublicUser } from "@/lib/types";

const SessionContext = createContext<PublicUser | null>(null);
export function useUser() {
  return useContext(SessionContext);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Cabinet({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    function load() {
      api<{ user: PublicUser }>("/api/auth")
        .then((data) => setUser(data.user))
        .catch(async () => {
          await fetch("/api/auth", { method: "DELETE" });
          router.replace("/login");
        });
    }
    load();
    window.addEventListener("od-profile", load);
    return () => window.removeEventListener("od-profile", load);
  }, [router]);

  async function logout() {
    await api("/api/auth", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  if (!user) return <div className="center">Загрузка…</div>;

  const links = [
    { href: "/profile", label: "Профиль" },
    { href: "/vote", label: "Голосование" },
    { href: "/profile/settings", label: "Настройки" },
  ];
  if (user.role === "admin") {
    links.splice(2, 0, { href: "/vote/results", label: "Результаты" });
    links.push({ href: "/admin", label: "Управление" });
  }

  return (
    <SessionContext.Provider value={user}>
      <div className="shell">
        <aside className="side">
          <Link href="/profile" className="side-logo">
            <img src="/logo.png?v=hell" alt="Hell Awards" className="side-logo-img" />
          </Link>
          <nav className="nav">
            {links.map((link) => {
              const active = link.href === "/vote" || link.href === "/profile" ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={active ? "active" : ""}>
                  {link.label}
                </Link>
              );
            })}
            <button className="nav-out" type="button" onClick={logout}>
              Выйти
            </button>
          </nav>
          <div className="side-user">
            <Link href="/profile" className="side-person">
              {user.profile.photo ? (
                <img className="avatar" src={user.profile.photo} alt="" />
              ) : (
                <div className="avatar">{initials(user.profile.fullName) || "ОД"}</div>
              )}
              <div className="side-id">
                <b title={user.profile.fullName}>{user.profile.fullName}</b>
                <span title={user.email}>{user.email}</span>
              </div>
            </Link>
            <button className="logout" type="button" onClick={logout}>
              Выйти
            </button>
          </div>
          <p className="owner">Сайт принадлежит Virginia group</p>
        </aside>
        <div className="main">
          <div className="main-inner">{children}</div>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
