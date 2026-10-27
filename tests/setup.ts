import fs from "node:fs";
import path from "node:path";

// Load .env.test BEFORE anything imports the Prisma client, and refuse to run against any
// database whose name does not end in "_test" — tests TRUNCATE tables.
const envFile = path.resolve(__dirname, "..", ".env.test");
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m) process.env[m[1]] = m[2];
}

const dbName = new URL(process.env.DATABASE_URL ?? "").pathname.replace("/", "");
if (!dbName.endsWith("_test")) {
  throw new Error(`Refusing to run tests against database "${dbName}" — DATABASE_URL in .env.test must point to a *_test database.`);
}
