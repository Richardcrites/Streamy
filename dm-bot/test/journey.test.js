import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-journey-${process.pid}.json`);
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENROUTER_API_KEY;

const store = await import("../src/store.js");
const story = await import("../src/engine/story.js");
const j = await import("../src/engine/journey.js");
const feed = await import("../src/handlers/feed.js");
const { AMBUSH, COMPLICATIONS, STOP_CAUSES, LUCKY, TUNNEL } = await import("../src/lore/journey.js");

const crew = [{ name: "RJ Oressian", conditions: [] }, { name: "Mira Kade", conditions: [] }];
const mission = (route) => ({ antagonist: "Soren Yardley", objectives: [{ role: "pilot", characterName: "RJ Oressian" }], route });
const unfilled = (s) => /\{[a-z]+\}/i.test(s || "");

test("routes are real quantum jumps: two in-system, four across a jump point", () => {
  const same = j.buildRoute({ system: "Pyro", start: "Checkmate Station", destination: "Shepherd's Rest, Bloom", crew });
  assert.equal(same.legs.length, 2);
  assert.equal(same.legs.at(-1).to, "Shepherd's Rest, Bloom");
  const cross = j.buildRoute({ system: "Pyro", startSystem: "Stanton", start: "Area18", destination: "Rat's Nest", crew });
  assert.equal(cross.legs.length, 4);
  assert.equal(cross.legs[0].to, "Pyro Gateway (Stanton)");
  assert.ok(cross.legs[1].tunnel);
  assert.equal(cross.legs[1].to, "Stanton Gateway (Pyro)");
});

test("each roll means something, and every event says what to do in game", () => {
  for (let d20 = 1; d20 <= 20; d20++) {
    const m = mission(j.buildRoute({ system: "Stanton", start: "Area18", destination: "Daymar", crew }));
    const e = j.rollJump(m, { d20, crew });
    const expected = d20 === 1 ? "ambush" : d20 <= 5 ? "stop" : d20 <= 9 ? "complication" : d20 === 20 ? "lucky" : "clean";
    assert.equal(e.kind, expected, `d20 ${d20}`);
    assert.ok(e.todo?.length > 10, `d20 ${d20} has an in-game action`);
    for (const t of [e.text, e.todo, e.action, e.talk]) assert.ok(!unfilled(t), t);
    if (["stop", "ambush"].includes(e.kind)) assert.ok(e.place, "a stop names a real place to put down");
  }
  // Ambushes and complications are backed by real contracts or game actions.
  for (const x of [...AMBUSH, ...COMPLICATIONS, ...STOP_CAUSES, ...LUCKY, ...TUNNEL.stop]) {
    assert.match(x.todo, /\*\*(Mercenary|Bounty Hunter|ECN|Search|Delivery|Service Beacon)\*\*|salvage|refuel|Land|land|engineering|buy|Dock|Reroute|fly|ten real minutes/i, x.todo);
  }
});

test("no more than two stops per mission, and crew damage forces the first one", () => {
  const hurt = [{ name: "RJ Oressian", conditions: [{ status: "active", kind: "ship" }] }, crew[1]];
  const m = mission(j.buildRoute({ system: "Pyro", startSystem: "Stanton", start: "Area18", destination: "Rat's Nest", crew: hurt }));
  const first = j.rollJump(m, { d20: 18, crew: hurt });
  assert.equal(first.kind, "stop");
  assert.equal(first.forced, "RJ Oressian");
  const rest = [2, 3, 4].map((d20) => j.rollJump(m, { d20, crew: hurt }));
  assert.equal([first, ...rest].filter((e) => ["stop", "ambush"].includes(e.kind)).length, 2);
  assert.ok(rest.at(-1).arrived);
  assert.equal(j.rollJump(m, { crew: hurt }), null, "nothing left to roll once you've arrived");
});

test("missions come with a route, and DM Link rolls a jump when the crew spools (once)", () => {
  const g = store.guild(`journey-${Math.random()}`);
  const [a, b] = ["RJ Oressian", "Mira Kade"].map((name, i) => {
    const c = story.buildCharacter(g, { ownerId: `u${i}`, originId: "pyro_outlaw", career: null, name, pronouns: "he" });
    g.characters[c.id] = c;
    return c;
  });
  const m = story.buildMission(g, [a, b], null, { pulled: { title: "Defend Occupants", location: "Shepherd's Rest, Bloom" } });
  m.status = "active";
  g.missions = { [m.id]: m };
  assert.equal(m.route.legs.at(-1).to, "Shepherd's Rest, Bloom", "the route ends at the contract's place");
  const jumps = [];
  feed.applyFeedEvents(g, a, [{ type: "quantum_spool", place: "Bloom (Pyro III)", at: "t" }], [], [], jumps);
  feed.applyFeedEvents(g, b, [{ type: "quantum_spool", place: "Bloom (Pyro III)", at: "t" }], [], [], jumps);
  assert.equal(jumps.length, 1, "two crew members spooling together roll one jump");
  assert.equal(m.route.next, 1);
});
