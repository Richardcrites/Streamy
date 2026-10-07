// Exit code 1 when `npm install` is needed: no node_modules yet, or package.json changed since the
// last install (compared by content, because unzipped updates keep old file dates). start.bat uses this
// to skip the install on normal launches. `node scripts/needs-install.cjs --done` records an install.
const fs = require("node:fs");
const crypto = require("node:crypto");
const stamp = "node_modules/.sc-dm-installed";
const hash = crypto.createHash("sha256").update(fs.readFileSync("package.json")).digest("hex");
if (process.argv.includes("--done")) {
  fs.writeFileSync(stamp, hash);
  process.exit(0);
}
let last = null;
try {
  last = fs.readFileSync(stamp, "utf8").trim();
} catch {
  // never installed (or installed before this check existed)
}
process.exit(last === hash ? 0 : 1);
