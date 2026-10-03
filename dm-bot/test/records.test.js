import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-rec-${process.pid}.json`);
process.env.OPENROUTER_API_KEY = "test";
const store = await import("../src/store.js");
const story = await import("../src/engine/story.js");
const rec = await import("../src/engine/records.js");
const handlers = await import("../src/handlers/records.js");

function setup() {
  const g = store.guild(`r${Math.random()}`);
  const mk = (owner, originId, name) => {
    const c = story.buildCharacter(g, { ownerId: owner, originId, career: "pilot", name, pronouns: "he" });
    g.characters[c.id] = c;
    g.activeChar[owner] = c.id;
    return c;
  };
  return { g, rj: mk("a", "pyro_outlaw", "RJ Oressian"), xo: mk("b", "navy_veteran", 'Jace "XO" Calder') };
}

test("conditions: add, show, clear", () => {
  const { rj } = setup();
  const c = rec.addCondition(rj, { kind: "ship", text: "Hull breached", severity: "major" });
  assert.equal(rec.activeConditions(rj).length, 1);
  assert.match(rec.conditionLine(c), /Hull breached.*major.*Repairs/);
  rec.clearCondition(rj, c.id, "repaired at Levski");
  assert.equal(rec.activeConditions(rj).length, 0);
});

test("the scribe can call characters by first name, callsign or surname", () => {
  const { rj, xo } = setup();
  const chars = [rj, xo];
  assert.equal(rec.findCharacter(chars, "rj"), rj);
  assert.equal(rec.findCharacter(chars, "XO"), xo);
  assert.equal(rec.findCharacter(chars, "Calder"), xo);
  assert.equal(rec.findCharacter(chars, "oressian"), rj);
  assert.equal(rec.findCharacter(chars, "Nobody"), null);
});

test("scribe: 'beat two Vanduul, RJ's ship is hurt, we have to land' becomes records", async () => {
  const { g, rj, xo } = setup();
  const mission = { id: "m", title: "Bitter Margin", status: "active", createdAt: new Date().toISOString() };
  g.missions = { m: mission };
  rec.addCondition(xo, { kind: "injury", text: "Cracked ribs" });
  const xoRibs = rec.activeConditions(xo)[0];
  let sentCharacters;
  globalThis.fetch = async (u, o) => {
    const body = JSON.parse(o.body);
    sentCharacters = JSON.parse(body.messages.at(-1).content.split("<input>")[1].split("</input>")[0]).characters;
    const out = {
      updates: [
        { character: "RJ", kind: "ship", text: "Hull damaged after a fight with two Vanduul; must land at the nearest planet", severity: "major", clears: "Land and repair", condition_id: "" },
        { character: "XO", kind: "clear", text: "ribs", severity: "", clears: "", condition_id: xoRibs.id },
        { character: "rj", kind: "location", text: "Nyx II", severity: "", clears: "", condition_id: "" },
        { character: "XO", kind: "journal", text: "Took down a Vanduul Scythe", severity: "", clears: "", condition_id: "" },
        { character: "Ghost", kind: "journal", text: "?", severity: "", clears: "", condition_id: "" },
      ],
      lore: ["Vanduul scouts are probing the Nyx–Virgil jump"],
      summary: "Won against two Vanduul. RJ's hull is damaged; landing on Nyx II.",
    };
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) } }] }));
  };
  const r = await handlers.parseAndApply(g, "beat 2 vanduul, rj hull messed up, landing nyx 2, xo ribs ok now, xo killed a scythe", "scribe");
  assert.ok(sentCharacters.some((c) => c.active_conditions.some((x) => x.condition_id === xoRibs.id)), "AI sees conditions it can clear");
  assert.equal(rec.activeConditions(rj)[0].kind, "ship");
  assert.equal(rj.location, "Nyx II");
  assert.equal(rec.activeConditions(xo).length, 0, "XO's ribs were cleared");
  assert.ok(xo.journal.some((j) => /Scythe/.test(j.text)));
  assert.deepEqual(r.unknown, ["Ghost"]);
  assert.equal(g.canon.length, 1);
  assert.deepEqual(mission.scribe, ["Won against two Vanduul. RJ's hull is damaged; landing on Nyx II."]);
  assert.ok(r.lines.length >= 4);
});

test("archive: missions and campaigns become readable stories, exportable with canon", () => {
  const { g, rj, xo } = setup();
  const m = story.buildMission(g, [rj, xo], "bounty");
  m.status = "complete";
  m.notes = "We let the pilot go.";
  m.epilogue = "Relay laughs.";
  rec.archiveMission(g, m, [rj, xo]);
  rec.addCanon(g, "Ysolde Pike keeps a safehouse under Patch City");
  const md = rec.archiveExport(g);
  assert.match(md, new RegExp(`# ${m.title}`));
  assert.match(md, /We let the pilot go/);
  assert.match(md, /The twist/);
  assert.match(md, /Server Canon[\s\S]*Patch City/);
});
