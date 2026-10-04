import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-link-${process.pid}.json`);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { createParser, describe, prettyPlace, prettyTarget } = await import("../link/parse.js");
const store = await import("../src/store.js");
const story = await import("../src/engine/story.js");
const feed = await import("../src/handlers/feed.js");
const rec = await import("../src/engine/records.js");

const sample = fs.readFileSync(path.join(HERE, "fixtures/game-sample.log"), "utf8").split("\n");
const parseAll = () => {
  const p = createParser();
  return sample.map(p).filter(Boolean);
};

test("parser reads 4.10 Game.log lines into story events", () => {
  const events = parseAll();
  const t = events.map((e) => e.type);
  assert.deepEqual(t, ["jurisdiction", "location", "ship", "quantum", "crimestat", "crimestat", "contract_accepted", "injury", "injury", "downed", "objective", "earned", "earned", "contract_complete", "medbed", "fined", "contract_shared"]);
  const by = (type) => events.find((e) => e.type === type);
  assert.equal(by("contract_accepted").title, "Verified Bounty: Test Target at QV Breaker Station");
  assert.equal(by("contract_shared").title, "Defend a location from Outlaws");
  assert.equal(by("location").place, "Rest stop at Bloom (Pyro III) low orbit");
  assert.equal(by("quantum").place, "the Pyro–Stanton jump point");
  assert.equal(by("ship").ship, "Drake Ironclad Assault");
  assert.deepEqual(by("medbed").parts, ["head", "left arm"]);
  assert.deepEqual({ ...by("injury"), at: undefined }, { type: "injury", at: undefined, severity: "major", label: "Moderate", part: "left arm", tier: 2 });
  for (const e of events) assert.ok(describe(e).length > 3);
});

test("location codes read like places", () => {
  assert.equal(prettyPlace("Stanton2_Orison"), "Orison (Crusader)");
  assert.equal(prettyPlace("Stanton2b_ASD_Delve_Facility_005"), "ASD Onyx facility on Daymar");
  assert.equal(prettyPlace("RR_JP_PyroNyx"), "Pyro–Nyx jump point station");
  assert.equal(prettyPlace("RR_CRU_L1"), "Rest stop at Crusader L1");
  assert.equal(prettyPlace("AsteroidClusterBase_Nyx_Social_Keeger_002"), "an asteroid base in the Keeger Belt (Nyx)");
  assert.equal(prettyTarget("rs_ext_nyx-castra_jp1"), "the Nyx–Castra jump point");
  assert.equal(prettyTarget("pyro3"), "Bloom (Pyro III)");
  assert.equal(prettyTarget("LOC_RR_S3_L1"), "Rest stop at ArcCorp L1");
});

test("the bot turns feed events into conditions, journal, location and mission progress", () => {
  const g = store.guild(`feed-${Math.random()}`);
  const c = story.buildCharacter(g, { ownerId: "u1", originId: "pyro_outlaw", career: null, name: "RJ Oressian", pronouns: "he" });
  g.characters[c.id] = c;
  g.activeChar.u1 = c.id;
  const m = story.buildMission(g, [c], "bounty");
  g.missions = { [m.id]: m };
  feed.applyFeedEvents(g, c, parseAll());
  assert.equal(c.location, "the Pyro–Stanton jump point");
  assert.equal(c.ship, "Drake Ironclad Assault");
  const active = rec.activeConditions(c);
  assert.equal(active.filter((x) => x.kind === "legal").length, 1, "two CrimeStat hits make one warrant");
  assert.match(active.find((x) => x.kind === "legal").text, /2×/);
  assert.equal(active.filter((x) => x.kind === "injury").length, 0, "the med bed healed head and left arm");
  assert.equal(c.conditions.filter((x) => x.kind === "injury" && x.status === "cleared").length, 2);
  assert.equal(c.earnedTotal, 1500);
  assert.ok(m.anchorTaken, "a Bounty Hunter contract counts as the mission's shared bounty contract");
  assert.ok(m.scribe.some((s) => /Verified Bounty/.test(s)));
  assert.ok(c.journal.some((j) => /Went down/.test(j.text)));
});

test("feed messages are only trusted from our webhook format", () => {
  assert.equal(feed.parseFeedMessage({ embeds: [{ footer: { text: "hello" } }] }), null);
  assert.equal(feed.parseFeedMessage({ embeds: [{ footer: { text: "DMLINK:{bad" } }] }), null);
  const ok = feed.parseFeedMessage({ embeds: [{ footer: { text: `DMLINK:${JSON.stringify({ v: 1, d: "u1", events: [{ type: "crimestat" }] })}` } }] });
  assert.equal(ok.d, "u1");
});

test("DM Link follows a growing Game.log and handles a new session", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dmlink-"));
  const log = path.join(dir, "Game.log");
  fs.writeFileSync(log, sample.slice(0, 3).join("\n") + "\n");
  const cfg = path.join(dir, "link.json");
  const code = Buffer.from(JSON.stringify({ u: "https://example.invalid/webhook", d: "u1" })).toString("base64url");
  fs.writeFileSync(cfg, JSON.stringify({ code, logPath: log }));
  const child = spawn(process.execPath, [path.join(HERE, "../link/dm-link.js"), "--dry-run"], { env: { ...process.env, DM_LINK_CONFIG: cfg } });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1500);
  fs.appendFileSync(log, sample.slice(6, 10).join("\n") + "\n"); // CrimeStat x2, contract, injury
  await wait(5500);
  fs.writeFileSync(log, sample[0] + "\n" + sample[2] + "\n"); // the game restarted: shorter file
  await wait(5500);
  child.kill();
  assert.match(out, /Watching/);
  assert.doesNotMatch(out.split("Watching")[1].split("New game session")[0], /Rest stop at Bloom/, "lines already in the log at start are not re-sent");
  assert.match(out, /CrimeStat rating increased/);
  assert.match(out, /Contract accepted: Verified Bounty: Test Target/);
  assert.match(out, /Moderate injury: left arm/);
  assert.match(out, /New game session detected/);
  assert.match(out.split("New game session")[1], /At Rest stop at Bloom/);
});

test("what DM Link posts is exactly what the bot reads back", async () => {
  const http = await import("node:http");
  const bodies = [];
  const server = http.createServer((req, res) => {
    let b = "";
    req.on("data", (d) => (b += d));
    req.on("end", () => {
      bodies.push(JSON.parse(b));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    });
  }).listen(0);
  const port = server.address().port;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dmlink-post-"));
  const log = path.join(dir, "Game.log");
  fs.writeFileSync(log, sample.join("\n") + "\n");
  const cfg = path.join(dir, "link.json");
  fs.writeFileSync(cfg, JSON.stringify({ code: Buffer.from(JSON.stringify({ u: `http://127.0.0.1:${port}/hook`, d: "u42" })).toString("base64url"), logPath: log }));
  const child = spawn(process.execPath, [path.join(HERE, "../link/dm-link.js"), "--replay"], { env: { ...process.env, DM_LINK_CONFIG: cfg } });
  await new Promise((r) => setTimeout(r, 6500));
  child.kill();
  server.close();
  assert.ok(bodies.length >= 1);
  const events = bodies.flatMap((b) => feed.parseFeedMessage({ embeds: b.embeds }).events);
  assert.ok(bodies.every((b) => b.username === "DM Link · TestPilot" && b.embeds[0].description));
  assert.ok(bodies.every((b) => feed.parseFeedMessage({ embeds: b.embeds }).d === "u42"));
  assert.equal(events.filter((e) => e.type === "earned").reduce((a, e) => a + e.amount, 0), 1500, "payouts are added up");
  assert.ok(events.some((e) => e.type === "contract_accepted"));
  assert.ok(bodies.every((b) => b.embeds[0].footer.text.length <= 2048));
});
