import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

for (const name of ["db.json", "secret.key"]) {
  const target = path.join(dataDir, name);
  const sources = [path.join("/etc/secrets", name), path.join(process.cwd(), name)];
  const source = sources.find((item) => fs.existsSync(item) && path.resolve(item) !== path.resolve(target));
  if (source) fs.copyFileSync(source, target);
}
