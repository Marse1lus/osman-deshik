export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export function safePhoto(value: string | undefined) {
  if (!value) return "";
  if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(value)) return value;
  if (/^\/api\/media\/[a-zA-Z0-9._-]+$/.test(value)) return value;
  return "";
}
