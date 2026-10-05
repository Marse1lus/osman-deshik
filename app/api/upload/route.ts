import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { clientIp, tooMany } from "@/lib/auth";
import { currentUser, updateDb } from "@/lib/db";
import { uploadDir } from "@/lib/paths";
import { MAX_PHOTO_BYTES } from "@/lib/photo";

export const dynamic = "force-dynamic";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function extensionFor(file: File) {
  const fromType = extensions[file.type];
  if (fromType) return fromType;
  const match = file.name.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/);
  if (!match) return "";
  return match[1] === "jpeg" ? "jpg" : match[1];
}

export async function POST(req: Request) {
  const user = await currentUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Выберите фото." }, { status: 400 });

  const extension = extensionFor(file);
  if (!extension) return NextResponse.json({ error: "Нужна картинка JPG, PNG, WEBP или GIF." }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "Фото больше 15 МБ." }, { status: 400 });

  const nominationId = String(form?.get("nominationId") || "");
  const optionId = String(form?.get("optionId") || "");
  const avatar = form?.get("purpose") === "avatar";
  if (nominationId && optionId) {
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  } else if (!avatar) {
    return NextResponse.json({ error: "Не указано, куда сохранить фото." }, { status: 400 });
  } else if (!user && tooMany(`avatar:${clientIp(req)}`, 12, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много загрузок. Попробуйте позже." }, { status: 429 });
  }

  const name = `${crypto.randomUUID()}.${extension}`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  const url = `/api/media/${name}`;

  if (nominationId && optionId) {
    await updateDb((db) => {
      const option = db.poll.nominations.find((nomination) => nomination.id === nominationId)?.options.find((item) => item.id === optionId);
      if (option) option.photo = url;
    });
    return NextResponse.json({ url });
  }

  if (user) {
    await updateDb((db) => {
      const row = db.users.find((item) => item.id === user.id);
      if (row) row.profile.photo = url;
    });
  }
  return NextResponse.json({ url });
}
