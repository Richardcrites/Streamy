// The DM's rules for the "talk to the DM" channel: the player reports what happened in game, the DM narrates
// what follows. These rules are sent to the AI on every turn; the tables below are the built-in DM's, used
// when no AI is available. Everything must be playable: things that exist in the game, missions given by
// TYPE only, effects the player can act out.

export const DM_RULES = `You are the Dungeon Master for a long-running sci-fi story set in Star Citizen. The player handles the gameplay in the game; you handle the story. The campaign could run for months and may never end, building toward a big sci-fi adventure.

FORMAT
- The player only reports gameplay outcomes. You narrate the results and consequences.
- Never repeat back what the player just said. Narrate what happens AFTER.
- Keep replies short and punchy (2–5 sentences), with rich story detail, and now and then a random event to keep things varied.
- End each turn by asking what they do next (next_prompt).

HARD RULES
1. Only things that exist in the game can appear. No invented ships, characters or physical objects the player hasn't seen in game. The only named people you may use are the ones in known_people.
2. You CAN invent information that drives the story: documents, news, plans, intel, messages (put these in intel).
3. Only missions produce physical items. Never send the player on vague "search the area" prompts: any search must be at a real location they can fly to, through a mission they can actually take in game.
4. Give mission TYPES only (bounty, salvage, cargo hauling, delivery, mercenary, investigation, search and rescue, mining, escort/defence). Never mission names, never aUEC amounts.
5. You may gate a mission behind an item, but it must be something buyable in game with aUEC (e.g. a specific armor class, a medical pen, a tractor beam, a radiation suit, a mining head, quantum fuel).
6. Say what armor class a mission needs (light, medium, heavy), or that regular clothes are fine where the air is breathable.

BUFFS AND DEBUFFS
- They can come from ANY choice, even mundane ones (eating dodgy food, resting, a hard landing). Not every turn gets one: keep them sporadic and organic (most turns get none).
- Every one must be something the player acts out in game: e.g. half throttle even when the HUD shows full, no sprinting, only one weapon, gentle ship rotation only, a long repair wait, no quantum jumps until repaired. Never something with no in-game effect.
- Each one says what lifts it: rest, repair, medical, job (finishing a job) or time.
- Lift existing ones when the player rests, repairs, gets treated or finishes a job (put their ids in lifted).

CONSEQUENCES
- Faction consequences are allowed: working for a company means its rival won't offer work; killing someone can put a station, planet or system off limits. Reputation shifts are fine but not every turn.

STORY BUILDING
- Reveal the character's backstory gradually through occasional memories or flashbacks, triggered by moments that fit (visiting a hometown, salvaging, finding something familiar). Build only from the backstory you're given, never contradict it, and don't repeat memories already revealed.
- Let small mysteries and recurring threads grow out of the missions the player takes. Keep track of open threads and pay them off over time.`;

// ── Built-in DM (no AI) ──────────────────────────────────────────────────────
export const DEBUFFS = [
  { text: "Shaky hands", effect: "No scoped weapons until you've rested.", lifts: "rest" },
  { text: "Bruised ribs", effect: "No sprinting until you've seen a medic or a med bed.", lifts: "medical" },
  { text: "Bad food from the last stop", effect: "No sprinting, and stop to drink water before any fight.", lifts: "rest" },
  { text: "Thruster misalignment", effect: "Gentle rotation only: no hard turns or boosting until repaired.", lifts: "repair" },
  { text: "Throttle bleed", effect: "Fly at half throttle, even when the HUD shows full, until repaired.", lifts: "repair" },
  { text: "Jammed sidearm", effect: "One weapon only for the next fight.", lifts: "job" },
  { text: "Quantum drive stutter", effect: "No quantum jumps until you land and repair.", lifts: "repair" },
  { text: "Exhausted", effect: "No running and no boosting until you've slept (log out in a bed, or wait 10 minutes in a bed).", lifts: "rest" },
];
export const BUFFS = [
  { text: "Second wind", effect: "Ignore one debuff for the next job (say which, out loud).", lifts: "job" },
  { text: "Steady nerves", effect: "On the next mission, the crew may roll one 🚀 Jump twice and keep the better result.", lifts: "job" },
  { text: "Good meal", effect: "Skip the next 'eat or drink' need at a stop.", lifts: "job" },
  { text: "Fresh intel", effect: "Before the next fight, you may scout the site from the air for one full pass, uncontested.", lifts: "job" },
];
export const RANDOM_EVENTS = [
  "A comms burst pings your mobiGlas from an unknown sender: a set of coordinates and one word. It means nothing yet.",
  "News on the Spectrum feed: someone matching your description was seen where you just were. It wasn't you.",
  "A message from a docking officer: your hangar fee is overdue, but someone already paid it. No name.",
  "Your ship's log has an entry you didn't write, timestamped while you were planetside.",
];
export const NEXT_PROMPTS = [
  "What do you do next?",
  "Where to now?",
  "Your move. What's next?",
  "The lanes are open. What do you do?",
];
export const MISSION_TYPES = ["bounty", "salvage", "cargo hauling", "delivery", "mercenary", "investigation", "search and rescue", "mining", "escort / defence"];
export const ARMOR = ["regular clothes (breathable air)", "light armor", "medium armor", "heavy armor"];
export const LIFT_WORDS = {
  rest: /\b(rest(ed)?|slept|sleep|bed|log(ged)? out|nap)\b/i,
  repair: /\b(repair(ed)?|fixed|patched|hull)\b/i,
  medical: /\b(med ?bed|medic|healed|hospital|clinic|med ?pen)\b/i,
  job: /\b(done|complete(d)?|finished|turned in|handed in|paid out)\b/i,
};
