"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Cabinet, useUser } from "@/components/Cabinet";
import { RoundPhoto } from "@/components/RoundPhoto";
import { api } from "@/lib/client";
import { votesLabel } from "@/lib/text";
import type { PollOption } from "@/lib/types";

type Section = {
  id: string;
  title: string;
  description: string;
  total: number;
  myChoices: string[];
  options: Array<PollOption & { votes: number; percentage: number }>;
};

type Payload = {
  poll: { title: string; subtitle: string };
  closed: boolean;
  ballots: number;
  sections: Section[];
};

function ResultsBody() {
  const user = useUser();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      router.replace("/profile");
      return;
    }
    api<Payload>("/api/poll").then(setData).catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить результаты."));
  }, [user, router]);

  if (!user || user.role !== "admin") return <div className="center">Загрузка…</div>;

  if (!data) return <div className="center">{error || "Загрузка…"}</div>;

  return (
    <div className="vote-wrap">
      {!data.closed ? (
        <div className="vote-top">
          <Link className="link" href="/vote">К голосованию</Link>
        </div>
      ) : null}
      <h1 className="page-title" style={{ textAlign: "center" }}>Результаты голосования</h1>
      <p className="page-lead" style={{ textAlign: "center" }}>
        {data.poll.title} {votesLabel(data.ballots)}.
      </p>
      {data.sections.map((section, index) => (
        <section className="section" key={section.id}>
          <h3>{index + 1}. {section.title}</h3>
          <div className="bars">
            {section.options.map((option) => (
              <div key={option.id} className={section.myChoices.includes(option.id) ? "bar mine" : "bar"}>
                <div className="bar-fill" style={{ width: `${option.percentage}%` }} />
                <RoundPhoto src={option.photo} name={option.title} size={52} />
                <div className="bar-name">
                  {option.title}
                  <small>{votesLabel(option.votes)}{section.myChoices.includes(option.id) ? " · ваш выбор" : ""}</small>
                </div>
                <b>{option.percentage}%</b>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Cabinet>
      <ResultsBody />
    </Cabinet>
  );
}
