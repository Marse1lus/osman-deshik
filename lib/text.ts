export function plural(n: number, one: string, few: string, many: string) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

export const REVOTE_AFTER_MS = 48 * 60 * 60 * 1000;

export function revoteLeft(updatedAt: string, now = Date.now()) {
  const left = new Date(updatedAt).getTime() + REVOTE_AFTER_MS - now;
  return left > 0 ? left : 0;
}

export function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function votesLabel(n: number) {
  return `${n} ${plural(n, "голос", "голоса", "голосов")}`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  let raw = digits;
  if (raw.startsWith("8")) raw = `7${raw.slice(1)}`;
  if (!raw.startsWith("7")) raw = `7${raw}`;
  raw = raw.slice(0, 11);
  const rest = raw.slice(1);
  let out = "+7";
  if (rest.length) out += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 3) out += `) ${rest.slice(3, 6)}`;
  if (rest.length >= 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length >= 8) out += `-${rest.slice(8, 10)}`;
  return out;
}

export function ageOptions() {
  const items = [{ value: "under18", label: "менее 18 лет" }];
  for (let age = 18; age <= 45; age += 1) {
    items.push({ value: String(age), label: String(age) });
  }
  items.push({ value: "45+", label: "Более 45" });
  return items;
}

export function deviceId() {
  const key = "od_device";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
