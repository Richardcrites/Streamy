import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-contract-${process.pid}.json`);
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENROUTER_API_KEY;

const store = await import("../src/store.js");
const story = await import("../src/engine/story.js");
const saga = await import("../src/engine/saga.js");
const feed = await import("../src/handlers/feed.js");
const { classifyContract, systemOf } = await import("../src/engine/contract.js");
const { ANCHORS, OBJECTIVES, CONTRACT_GUIDE } = await import("../src/lore/data.js");
const { SAGAS } = await import("../src/lore/sagas.js");

function crew(g, n = 2) {
  return Array.from({ length: n }, (_, i) => {
    const c = story.buildCharacter(g, { ownerId: `u${i}`, originId: ["pyro_outlaw", "navy_veteran", "levski_born"][i], career: null, name: ["RJ Oressian", "Mira Kade", "Tomothy Fulari"][i], pronouns: "he" });
    g.characters[c.id] = c;
    g.activeChar[`u${i}`] = c.id;
    return c;
  });
}

test("contracts are read as what they really are", () => {
  const cases = {
    "Defend Occupants": "defend", "Clear Citizens for Prosperity Servers": "clear", "Jorrit Dossier: Onyx Personnel Files": "investigate",
    "Verified Bounty: Medium Risk Target": "bounty", "Covalex Hauling: Large Cargo": "haul", "Missing Person": "search",
    "Vanduul-Tech Smugglers": "investigate", "Package Delivery": "delivery", "Salvage Rights": "salvage", "ECN Alert": "rescue",
  };
  for (const [title, key] of Object.entries(cases)) assert.equal(classifyContract(title).key, key, title);
  assert.equal(systemOf("Carver's Ridge, Bloom"), "Pyro");
  assert.equal(systemOf("Rat's Nest"), "Pyro");
  assert.equal(systemOf("Daymar"), "Stanton");
  assert.equal(systemOf("Levski"), "Nyx");
});

test("a pulled contract is the mission's spine: its place, its kind of job, no other contract", () => {
  const g = store.guild(`pulled-${Math.random()}`);
  const cs = crew(g);
  const m = story.buildMission(g, cs, "smuggle", { pulled: { title: "Defend Occupants", location: "Carver's Ridge, Bloom" } });
  assert.equal(m.type, "defense", "the contract decides the kind of job, not the requested type");
  assert.equal(m.system, "Pyro");
  assert.ok(m.anchor.pulled);
  assert.match(m.anchor.contract, /Defend Occupants/);
  assert.equal(m.anchor.where, "Carver's Ridge, Bloom");
  assert.match(m.briefing, /Defend Occupants/);
  assert.ok(m.addon, "the DM can add one optional extra");
  assert.ok(!/hauling/i.test(m.anchor.standIn), "a defend contract isn't described as a cargo run");
});

test("no anchor or objective asks for a hauling contract flown as a convoy", () => {
  const all = [...Object.values(ANCHORS).flat().map((a) => a.contract + a.standIn), ...Object.values(OBJECTIVES).flat(), ...Object.values(CONTRACT_GUIDE),
    ...SAGAS.flatMap((t) => [...t.leads.map((l) => l.contract), t.finalePlay.contract])];
  for (const s of all) assert.ok(!/convoy/i.test(s) || /alliance aid/i.test(s), s);
  for (const s of all) assert.ok(!/(fly|flies|flown) escort/i.test(s), s);
});

test("a pulled contract that matches the saga's lead carries the lead; anything else is a side job", async () => {
  const { createMission } = await import("../src/handlers/mission.js");
  const g = store.guild(`pulled-saga-${Math.random()}`);
  const cs = crew(g);
  g.saga = saga.createSaga(g, cs, "hyperion");
  const lead = await createMission(g, cs, null, "u0", { title: "Jorrit Dossier: Onyx Personnel Files", location: "Daymar" });
  assert.equal(lead.mission.saga?.beat.kind, "lead");
  assert.ok(lead.mission.anchor.pulled && lead.mission.anchor.saga);
  const side = await createMission(g, cs, null, "u0", { title: "Covalex Hauling: Large Cargo", location: "Area18" });
  assert.equal(side.mission.saga, undefined);
  assert.ok(side.mission.sagaSide?.purpose);
  assert.equal(side.mission.system, "Stanton");
  const fields = side.message.embeds.flatMap((e) => e.toJSON().fields).map((f) => f.name);
  assert.ok(fields.some((n) => /Your contract/.test(n)));
  assert.ok(fields.some((n) => /side job/.test(n)));
  assert.ok(fields.some((n) => /Optional extra/.test(n)));
  assert.ok(!fields.some((n) => /Meet at/.test(n)), "the contract's place replaces the generic meet-up");
});

test("DM Link: an accepted contract becomes an offer, and everyone it's shared with joins the crew", () => {
  const g = store.guild(`pulled-feed-${Math.random()}`);
  const [a, b] = crew(g);
  const offers = [];
  feed.applyFeedEvents(g, a, [{ type: "contract_accepted", title: "Defend Occupants", at: "t" }], [], offers);
  assert.equal(offers.length, 1);
  feed.applyFeedEvents(g, b, [{ type: "contract_shared", title: "Defend Occupants", at: "t" }], [], []);
  assert.deepEqual(offers[0].charIds, [a.id, b.id]);
  // Once a mission is built on it, the contract counts as taken.
  const m = story.buildMission(g, [a, b], null, { pulled: { title: "Defend Occupants" } });
  m.status = "active";
  g.missions = { [m.id]: m };
  feed.applyFeedEvents(g, b, [{ type: "contract_shared", title: "Defend Occupants", at: "t" }]);
  assert.ok(m.anchorTaken);
});
