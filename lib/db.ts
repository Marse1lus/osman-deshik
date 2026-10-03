import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { hashPassword, readSession } from "./auth";
import { dataDir } from "./paths";
import type { Db, PublicUser, User } from "./types";

const dbPath = path.join(dataDir(), "db.json");

export const ADMIN_EMAIL = "admin@osman.local";
export const ADMIN_PASSWORD = "OsmanAdmin2026";

function seedPoll(): Db["poll"] {
  const nomination = (id: string, title: string, description: string) => ({
    id,
    title,
    description,
    maxChoices: 1,
    options: [1, 2, 3, 4].map((n) => ({
      id: `${id}-${n}`,
      title: `Участник ${n}`,
      subtitle: "",
      photo: "",
    })),
  });

  return {
    title: "Народное голосование",
    subtitle: "Выберите фаворита в каждой номинации. Один аккаунт — один голос, его можно изменить, пока приём голосов открыт.",
    deadline: null,
    nominations: [
      nomination("best", "Выбор зрителей", "Кто вам ближе всего в этой номинации?"),
      nomination("open", "Открытие года", "Отметьте самый яркий дебют."),
      nomination("sympathy", "Приз симпатий", "Отдайте голос тому, кого хотите видеть победителем."),
    ],
  };
}

async function ensureDb() {
  if (fs.existsSync(dbPath)) return;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const password = await hashPassword(ADMIN_PASSWORD);
  const db: Db = {
    users: [
      {
        id: "admin",
        email: ADMIN_EMAIL,
        passwordHash: password.hash,
        passwordSalt: password.salt,
        role: "admin",
        createdAt: new Date().toISOString(),
        profile: {
          fullName: "Администратор",
          gender: "Мужской",
          city: "Москва",
          phone: "+7 (900) 000-00-00",
          telegram: "",
          age: "30",
          photo: "",
        },
      },
    ],
    votes: [],
    resets: [],
    poll: seedPoll(),
    limits: {
      maxAccountsPerIp: 8,
      maxAccountsPerDevice: 3,
      maxSubmissionsPer30Min: 2,
    },
  };
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

let chain: Promise<unknown> = Promise.resolve();

export async function readDb(): Promise<Db> {
  await ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, "utf8")) as Db;
}

export function updateDb<T>(mutator: (db: Db) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function toPublic(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    profile: { ...user.profile, photo: user.profile.photo || "" },
  };
}

export async function currentUser() {
  const token = cookies().get("session")?.value;
  const session = readSession(token);
  if (!session) return null;
  const db = await readDb();
  return db.users.find((user) => user.id === session.uid) || null;
}

export function pollClosed(db: Db) {
  if (!db.poll.deadline) return false;
  return new Date(db.poll.deadline).getTime() < Date.now();
}
