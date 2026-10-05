import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { uploadDir } from "@/lib/paths";

export const dynamic = "force-dynamic";

const types: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = params.name;
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return new NextResponse(null, { status: 404 });
  const candidates = [path.join(uploadDir(), name), path.join(process.cwd(), "public", "uploads", name)];
  for (const file of candidates) {
    try {
      const body = await readFile(file);
      const ext = name.split(".").pop()?.toLowerCase() || "";
      return new NextResponse(new Uint8Array(body), {
        headers: {
          "Content-Type": types[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      continue;
    }
  }
  return new NextResponse(null, { status: 404 });
}
