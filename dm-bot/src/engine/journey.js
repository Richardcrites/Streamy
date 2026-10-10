// The road to the job. A mission's route is a chain of real quantum jumps. Nothing on it is decided in
// advance: each jump is rolled live (d20) when the crew spools, by the 🚀 Jump button or by DM Link
// seeing the jump in Game.log. Every event says what to do about it in game.

import { WAYPOINTS, GATEWAYS, HOSTILES, CLEAN, LUCKY, COMPLICATIONS, STOP_CAUSES, TUNNEL, AMBUSH, WAIT_TALK, MAX_STOPS } from "../lore/journey.js";
import { STOP_PLACES, STOP_ACTIONS, STOP_NEEDS, STOP_REASONS } from "../lore/data.js";
import { fill, pick } from "./util.js";

const SYSTEMS = ["Stanton", "Pyro", "Nyx"];
// Two DM Link players in the same party both log the jump: only the first one rolls it.
export const JUMP_COOLDOWN_MS = 90_000;

// start/startSystem: where the crew sets off. destination: the job's place in `system`.
export function buildRoute({ system, start, startSystem = system, destination, crew = [] }) {
  const from = SYSTEMS.includes(startSystem) ? startSystem : system;
  const midIn = (sys, avoid) => pick((WAYPOINTS[sys] || WAYPOINTS.Stanton).filter((w) => w !== avoid)) || "the nearest rest stop";
  const legs = [];
  if (from !== system && GATEWAYS[`${from}>${system}`]) {
    const [out, inn] = GATEWAYS[`${from}>${system}`];
    legs.push({ from: start, to: out, system: from });
    legs.push({ from: out, to: inn, system, tunnel: true });
    const mid = midIn(system);
    legs.push({ from: inn, to: mid, system });
    legs.push({ from: mid, to: destination, system });
  } else {
    const mid = midIn(system, start);
    legs.push({ from: start, to: mid, system });
    legs.push({ from: mid, to: destination, system });
  }
  // Damage or injuries the crew carries force a stop before anything else.
  const forced = [];
  const damaged = crew.find((c) => (c.conditions || []).some((x) => x.status === "active" && x.kind === "ship"));
  const hurt = crew.find((c) => (c.conditions || []).some((x) => x.status === "active" && x.kind === "injury"));
  if (damaged) forced.push({ kind: "ship", who: damaged.name });
  if (hurt) forced.push({ kind: "injury", who: hurt.name });
  return { legs, next: 0, stops: 0, events: [], forced: forced.slice(0, MAX_STOPS), lastAt: 0 };
}

const roleName = (mission, role) => mission.objectives?.find((o) => o.role === role)?.characterName?.split(/\s+/)[0];

// A real place to put down in this system, of a fitting kind.
function placeFor(system, kinds) {
  const places = STOP_PLACES[system] || STOP_PLACES.Stanton;
  const fit = places.filter((p) => kinds.includes(p.kind));
  return pick(fit.length ? fit : places);
}

function stopAt(p) {
  const action = fill(pick(STOP_ACTIONS[p.kind] || STOP_ACTIONS.hostile), {
    faction: p.faction ? (p.faction.endsWith("s") ? `The ${p.faction}` : p.faction) : "Someone",
    ground: p.faction ? `${p.faction.replace(/s$/, "")} ground` : "someone else's ground",
  });
  // A hostile place can always be stood in for by a contract, if the game doesn't put anyone there.
  const contract = ["hostile", "held"].includes(p.kind) ? " (No one there in game? Take a **Mercenary** contract to clear a site in this system: that's this place.)" : "";
  return { place: p.place, placeKind: p.kind, action: action + contract, need: pick(STOP_NEEDS) };
}

// Roll the next jump. Returns the event, or null when the crew has already arrived.
export function rollJump(mission, { d20 = 1 + Math.floor(Math.random() * 20), crew = [] } = {}) {
  const route = mission.route;
  if (!route || route.next >= route.legs.length) return null;
  const index = route.next;
  const leg = route.legs[index];
  const names = crew.map((c) => c.name.split(/\s+/)[0]);
  const vars = {
    to: leg.to, from: leg.from, who: pick(names) || "someone",
    pilot: roleName(mission, "pilot") || pick(names) || "the pilot",
    engineer: roleName(mission, "engineer") || pick(names) || "whoever knows engines",
    hostiles: pick(HOSTILES[leg.system] || HOSTILES.Stanton),
    npc: mission.antagonist || mission.target || "someone from your past",
  };
  const f = (t) => fill(t, vars);
  const canStop = route.stops < MAX_STOPS;
  const base = { leg: index + 1, of: route.legs.length, from: leg.from, to: leg.to, system: leg.system, tunnel: Boolean(leg.tunnel), d20 };
  let event;

  if (route.forced.length && canStop) {
    // A crew condition decides this jump, whatever the dice say.
    const cond = route.forced.shift();
    const p = placeFor(leg.system, cond.kind === "ship" ? ["resupply"] : ["friendly", "resupply", "camp"]);
    event = {
      ...base, kind: "stop", forced: cond.who,
      text: fill(pick(STOP_REASONS[cond.kind]), { who: cond.who }) + ".",
      todo: cond.kind === "ship" ? "Land and repair before anything else: fix the damage at a station or with a repair tool. The rest of the crew keeps watch." : `Land somewhere safe and get ${cond.who.split(/\s+/)[0]} into a med bed, or patched up with med pens. Nobody jumps until they're on their feet.`,
      ...stopAt(p), talk: f(pick(WAIT_TALK)),
    };
  } else if (leg.tunnel) {
    if (d20 <= 5 && canStop) {
      const t = pick(TUNNEL.stop);
      const gateway = t.at === "to" ? leg.to : leg.from;
      const g = (x) => fill(x, { ...vars, gateway });
      event = { ...base, kind: "stop", text: g(t.text), todo: g(t.todo), place: gateway, placeKind: "resupply", action: "Station services: repairs, fuel, food and a bunk. Security is watching everyone who comes through.", need: pick(STOP_NEEDS), talk: f(pick(WAIT_TALK)) };
    } else {
      event = { ...base, kind: "clean", text: f(pick(TUNNEL.clean)), todo: "Fly the jump tunnel in game and keep away from the walls." };
    }
  } else if (d20 === 1 && canStop) {
    const a = pick(AMBUSH);
    event = { ...base, kind: "ambush", text: f(a.text), todo: f(a.todo), ...stopAt(placeFor(leg.system, ["resupply", "friendly", "camp"])), talk: null };
  } else if (d20 <= 5 && canStop) {
    const c = pick(STOP_CAUSES);
    event = { ...base, kind: "stop", cause: c.why, text: f(c.text), todo: f(c.todo), ...stopAt(placeFor(leg.system, c.why === "quantum fuel" ? ["resupply"] : ["hostile", "held", "camp", "friendly", "wreck", "resupply"])), talk: f(pick(WAIT_TALK)) };
  } else if (d20 <= 9) {
    const c = pick(COMPLICATIONS);
    event = { ...base, kind: "complication", text: f(c.text), todo: f(c.todo) };
  } else if (d20 === 20) {
    const l = pick(LUCKY);
    event = { ...base, kind: "lucky", text: f(l.text), todo: f(l.todo) };
  } else {
    event = { ...base, kind: "clean", text: f(pick(CLEAN)), todo: `Fly the jump to ${leg.to}.` };
  }
  if (["stop", "ambush"].includes(event.kind)) route.stops++;
  event.arrived = index === route.legs.length - 1;
  route.next++;
  route.lastAt = Date.now();
  route.events.push(event);
  return event;
}

export const KIND_LABEL = { clean: "Clean jump", lucky: "Lucky break", complication: "Complication", stop: "Forced stop", ambush: "Ambush" };

// One line per jump, for the archive and the AI.
export const eventLine = (e) => `Jump ${e.leg} (${e.from} → ${e.to}, d20 ${e.d20}): ${KIND_LABEL[e.kind]}. ${e.text}${e.place ? ` Stopped at ${e.place}.` : ""}`;

// What the DM says out loud.
export function eventSpoken(e) {
  const head = e.tunnel ? "Into the jump point." : `Jump ${e.leg}.`;
  const stop = e.place ? ` Put down at ${e.place}. ${e.action || ""}` : "";
  const end = e.arrived && !["stop", "ambush"].includes(e.kind) ? " And that's it: you're there. The job is yours." : "";
  // Say what to do too: in voice, nobody is reading Discord.
  return `${head} ${e.text} ${e.todo}${stop}${end}`.replace(/\*\*/g, "");
}
