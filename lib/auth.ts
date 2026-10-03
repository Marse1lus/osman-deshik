import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { dataDir } from "./paths";

const scryptAsync = promisify(scrypt);

function secret() {
  const secretPath = path.join(dataDir(), "secret.key");
  if (!fs.existsSync(secretPath)) {
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, randomBytes(32).toString("hex"));
  }
  return fs.readFileSync(secretPath, "utf8").trim();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return { salt, hash: hash.toString("hex") };
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const actual = (await scryptAsync(password, salt, 64)) as Buffer;
  const stored = Buffer.from(expected, "hex");
  if (actual.length !== stored.length) return false;
  return timingSafeEqual(actual, stored);
}

type SessionPayload = { uid: string; exp: number };

export function signSession(uid: string) {
  const payload: SessionPayload = { uid, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.uid || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return {
    name: "session",
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    },
  };
}

export function clearCookie() {
  return {
    name: "session",
    value: "",
    options: { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 0 },
  };
}

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

const hits = new Map<string, number[]>();

export function tooMany(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}
