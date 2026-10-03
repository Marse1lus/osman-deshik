import path from "path";

export function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

export function uploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}
