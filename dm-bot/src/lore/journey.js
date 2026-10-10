// The road to the job. A mission's route is a chain of real quantum jumps (and, between systems, a jump
// point). Nothing on it is decided in advance: each jump is rolled live on a d20 when the crew spools
// (the 🚀 Jump button, or DM Link seeing the jump in Game.log), and the DM says what happens.
// Everything here is something the game really does: quantum fuel, drive heat, obstructed routes,
// interdiction, service beacons, security scans, gateway traffic and the jump tunnel itself.

import { PYRO_STATIONS } from "./pyro.js";

// Real places a quantum jump can end at, per system.
export const WAYPOINTS = {
  Stanton: [
    "Rest stop at Hurston L1 (HUR-L1)", "Rest stop at Hurston L2 (HUR-L2)", "Rest stop at Crusader L1 (CRU-L1)", "Rest stop at Crusader L4 (CRU-L4)",
    "Rest stop at ArcCorp L1 (ARC-L1)", "Rest stop at ArcCorp L4 (ARC-L4)", "Rest stop at microTech L1 (MIC-L1)", "Rest stop at microTech L2 (MIC-L2)",
    "Everus Harbor (Hurston orbit)", "Seraphim Station (Crusader orbit)", "Baijini Point (ArcCorp orbit)", "Port Tressler (microTech orbit)",
  ],
  Pyro: PYRO_STATIONS.map((st) => `${st.name} (${st.where.replace(/ \(.*\)$/, "")})`),
  Nyx: ["Levski (Delamar)", "an asteroid base in the Glaciem Ring", "an asteroid base in the Keeger Belt"],
};

// Jump point gateway stations: the station on each side of a jump.
export const GATEWAYS = {
  "Stanton>Pyro": ["Pyro Gateway (Stanton)", "Stanton Gateway (Pyro)"],
  "Pyro>Stanton": ["Stanton Gateway (Pyro)", "Pyro Gateway (Stanton)"],
  "Stanton>Nyx": ["Nyx Gateway (Stanton)", "Stanton Gateway (Nyx)"],
  "Nyx>Stanton": ["Stanton Gateway (Nyx)", "Nyx Gateway (Stanton)"],
  "Pyro>Nyx": ["Nyx Gateway (Pyro)", "Pyro Gateway (Nyx)"],
  "Nyx>Pyro": ["Pyro Gateway (Nyx)", "Nyx Gateway (Pyro)"],
};

// Who jumps you in each system.
export const HOSTILES = {
  Stanton: ["Nine Tails raiders", "a pirate crew out of GrimHEX", "a bounty hunter who thinks one of you is worth something"],
  Pyro: ["a Headhunter snare crew", "XenoThreat fighters", "scavengers who saw a fat target"],
  Nyx: ["Shattered Blade fighters", "Moraine gang raiders", "something that flies like a Vanduul scout"],
};

// ── What can happen on a jump. {to} next stop, {from} last one, {who} a crew member, {pilot} {engineer}
// the crew's pilot/engineer (or someone), {hostiles}, {npc} someone from the mission's story. ──
export const CLEAN = [
  "The jump holds. Long quantum ride: {who}, tell the crew something about your past they haven't heard yet.",
  "Clean jump. The stars stretch and settle. {pilot}, what's the one thing you always check before a job like this?",
  "Smooth run. Use the quiet: who on this crew do you trust least right now, and why? Say it, or don't.",
  "The drive hums, nothing bites. {who}, what are you going to do with your cut?",
  "Quiet lanes. Somebody put music on. {who} picks the song and says why it matters.",
  "A clean jump. {engineer} listens to the drive the whole way and doesn't like one of the noises. Nobody else can hear it.",
  "Nothing but stars. Run the plan out loud once more: who goes in first, who watches the exit?",
  "Clean. Somewhere along the way, {who} goes quiet thinking about {npc}. Someone ask why.",
];

// Every event below points at something you DO in game, usually a real contract standing in for the story.
export const LUCKY = [
  { text: "Clean jump, and a gift: a derelict beacon pings off your scanners on the way into {to}.", todo: "Take a **salvage** contract, or strip any wreck you can find near {to}, before the job. Keep what you find: the DM may ask about it later." },
  { text: "The lanes are empty and you make the best time of your lives. {pilot} found a line nobody else uses.", todo: "You're early: fly a slow pass over the job site from the air and call out what you see before anyone lands." },
  { text: "A friendly hauler hails you on the way in with a rumour about the job, for free. That never happens.", todo: "Land at {to} and buy the hauler's crew a drink at the bar (any food or drink from a shop). One of you plays the hauler: what do they know about {npc}?" },
];

export const COMPLICATIONS = [
  { text: "A distress call cuts across your jump near {to}: someone's under attack, and they're begging.", todo: "Take a **Mercenary** defend contract or answer an **ECN** alert in this system: that's the distress call. Or fly past, and live with it." },
  { text: "A contact matched your vector the whole jump. When you drop out at {to}, it drops out too, a few kilometres back.", todo: "Take a **Bounty Hunter** contract in this system (pick the tier together): the target is whoever's been tailing you. Bring them down before the job." },
  { text: "Someone at {to} is selling exactly what this job will need, and the price is going up by the minute.", todo: "Land at {to} and buy one thing each at the shops (ammo, a med pen, food). Whoever spends the least explains why." },
  { text: "A message from {npc} cuts in mid-jump, short and badly encrypted. It wasn't meant for you.", todo: "Take a **Delivery** contract out of {to} if one's up: the package is what the message was about. If none, {who} reads the message out in voice (make it up: a time, a place, one word nobody understands)." },
  { text: "The drive stutters coming out of the jump. Nothing broken yet, but {engineer} wants a look before the next one.", todo: "{engineer}: open the engineering screen in game and check power, coolers and the quantum drive before anyone spools again." },
  { text: "Someone is stranded near {to}, out of fuel and out of luck, and you're the closest ship.", todo: "Take a **Search** contract or answer a **Service Beacon** in this system: that's them. Or if a crewmate's low on fuel, refuel them in game." },
];

// Why you're forced to stop partway (real quantum-travel limits), and what you do about it in game.
export const STOP_CAUSES = [
  { why: "quantum fuel", text: "The quantum fuel gauge drops faster than it should. You won't reach {to} without topping up.", todo: "Land and refuel: quantum fuel is sold at stations and rest stops. Pay for it in game before you jump again." },
  { why: "drive heat", text: "The quantum drive overheats halfway and throws you out of the jump. It needs time to cool, and a look.", todo: "Land. {engineer} checks the drive and coolers on the engineering screen and repairs anything worn; everyone else stands watch." },
  { why: "obstruction", text: "The route to {to} runs straight through a planet's shadow. The nav computer refuses the jump.", todo: "Reroute in game: jump to a nearby orbital marker or Lagrange rest stop first, then on to {to}. You put down on the way." },
  { why: "flare", text: "A solar flare sweeps the lanes. Flying through it fries electronics, so everyone with sense is grounded.", todo: "Land and wait it out: ten real minutes, engines off. Nobody leaves early." },
  { why: "tail", text: "Someone's been on your tail since {from}. You need to lose them, and the easiest place is the ground.", todo: "Land and kill your engines. Then take a **Bounty Hunter** contract in this system: the target is your tail. Finish it before the job." },
];

export const TUNNEL = {
  clean: [
    "Into the jump tunnel. The walls ripple like heat haze. {pilot}, keep it centred: touch the walls and the ship takes damage.",
    "The tunnel takes you. Nobody speaks. It's always quieter in here than you expect.",
  ],
  stop: [
    { at: "from", text: "The jump point is backed up. {gateway} is holding every ship for inspection, yours included.", todo: "Dock at {gateway} and wait your turn: get out, walk the station, eat something from the shops. Someone there recognises one of you." },
    { at: "to", text: "The tunnel spits you out early and the ship comes out rattling. {gateway} is the only place to put down and check it.", todo: "Dock at {gateway} and repair before you go on. {engineer} checks components; the rest of you find out why the tunnel's acting up." },
  ],
};

export const AMBUSH = [
  { text: "Something yanks you out of quantum halfway to {to}. Interdiction: {hostiles}, and they were waiting for you.", todo: "Take a **Bounty Hunter** or **Mercenary** ship-combat contract in this system right now: those are the ships that pulled you out. Win it, then land and patch up before you jump again." },
  { text: "A snare drops you out of the jump right into {hostiles}. Somebody sold your route.", todo: "Take a **Mercenary** contract in this system (any fight): that's the ambush. Afterwards, land to patch up, and ask the question nobody wants to: who sold you out?" },
];

// Things to do while you're stuck somewhere (said out loud, in voice).
export const WAIT_TALK = [
  "Everyone says one thing they'd do differently if this job goes bad.",
  "{who} cooks, badly. Everyone else complains, kindly.",
  "Someone takes first watch and someone else doesn't sleep anyway. Why not?",
  "{who} finally asks the question everyone's been avoiding.",
  "Count the ammo, the med pens and the water. Somebody's short.",
];

export const MAX_STOPS = 2;
