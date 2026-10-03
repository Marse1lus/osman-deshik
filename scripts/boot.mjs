import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

for (const name of ["db.json", "secret.key"]) {
  const target = path.join(dataDir, name);
  if (fs.existsSync(target)) continue;
  const sources = [path.join("/etc/secrets", name), path.join(process.cwd(), name)];
  const source = sources.find((item) => fs.existsSync(item));
  if (source) fs.copyFileSync(source, target);
}
