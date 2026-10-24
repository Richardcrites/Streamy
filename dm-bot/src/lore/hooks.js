// Story hooks, written like the first lines of a sci-fi novel chapter: a specific moment, a sensory detail,
// a person, and a pull into the story. Built ONLY from Star Citizen lore: canon events, real places, real
// factions, real ships, and objects that exist in the game. Each sentence shape and each detail is used as
// rarely as possible on a server, so every character's hooks read fresh.
//
// Slots: {npc} the person (always named, never a pronoun), {short} the character, {they} {them} {their}
// the character's pronouns (only with past-tense verbs or modals), {place} {event} {object}, {ship} ("a Drake
// Cutlass Black") or {ship_name} ("Drake Cutlass Black"), {faction} or {Faction} (capitalised, to start a sentence).
// tags: traits from the player's own words that pull a shape forward.

export const HOOK_TYPES = ["enemy", "debt", "lost", "secret", "oath"];

export const HOOK_TEMPLATES = {
  enemy: [
    { text: "The last time {short} saw {npc}, it was through the cracked canopy of {ship} going down over {place}. {npc} walked away from that crash. So did the grudge." },
    { text: "{npc} came out of {event} with a burn scar and one story to tell: that {short} lit the match. {npc} has been telling it in every bar from {place} outward." },
    { text: "Someone at {place} is paying good money for {short}'s old flight logs. Every transfer is signed the same way: {npc}." },
    { text: "{npc} flies for {faction} now, and {faction} never forgets a name. Last week, {short}'s turned up on one of their boards." },
    { text: "Three words came over an unmarked channel the night {short} left {place}: \"I'll find you.\" The voiceprint matched {npc}." },
    { text: "{npc} lost everything in {event} and decided long ago whose fault it was. {short} has seen the same {ship_name} in the scanner returns three times this month." },
    { text: "On paper, {npc} is a respectable broker at {place}. Off paper, {npc} keeps a datapad with {short}'s name at the top of a very short list." },
    { text: "{short} once cost {npc} a contract with {faction}. {npc} has spent every year since climbing back, and is finally high enough to look down." },
    { text: "{npc} was in the front row the night {short}'s act ended a career, and filmed every second. Copies are still selling at {place}.", tags: ["joker", "artist"] },
    { text: "{npc} signed the court-martial papers with a steady hand. Now {npc} is out of uniform, working for {faction}, and asking where {short} sleeps.", tags: ["ex_military"] },
  ],
  debt: [
    { text: "{npc} pulled {short} out of {event} when nobody else would come. That kind of debt isn't paid in credits, and {npc} has just sent word from {place} that it's due." },
    { text: "The {ship_name} that {short} flies was bought with {npc}'s money and a handshake at {place}. The handshake is the part {npc} is calling in." },
    { text: "{npc} vouched for {short} to {faction} once. When {short} walked, {npc} paid the price. The bill has been waiting at {place} ever since." },
    { text: "There's a datapad at {place} with {short}'s thumbprint on it and {npc}'s terms underneath. The interest has been running since {event}." },
    { text: "One comm call from {npc} kept {short} out of Klescher, and {npc} never mentioned it again. Until last night." },
    { text: "{npc} sold {short}'s debt to {faction} last cycle. They don't send reminders. They send people." },
    { text: "When {short} needed {object}, {npc} found one, no questions asked. Now {npc} needs something found, and all the questions are on the other side." },
    { text: "{npc} covered {short}'s losses at the Checkmate tables with a smile and a marker. The marker just changed hands at {place}.", tags: ["gambler"] },
  ],
  lost: [
    { text: "{npc}'s last message was forty seconds of static and a timestamp from the night of {event}. {short} has played it more times than {they} would admit." },
    { text: "{npc} was supposed to be on the shuttle out of {place}. The manifest says boarded. Nobody saw anyone get off." },
    { text: "Somewhere in the 'Verse, {npc} is alive. {short} is sure of it: someone has been using {npc}'s old access codes at {place}." },
    { text: "{npc} went looking for answers after {event} and stopped writing home. The last thing {npc} sent, {object}, still sits unopened in {short}'s locker." },
    { text: "{npc} took a job with {faction} and vanished from every registry that same week. {Faction} says it has never heard the name." },
    { text: "The beacon from {npc}'s {ship_name} still pings once a day from somewhere near {place}. Nobody answers it. Nobody has gone to look." },
    { text: "{short} buried an empty box for {npc} after {event}. Last month, a clinic at {place} billed {short} for {npc}'s treatment." },
    { text: "{npc} walked into the regen clinic at {place} and never walked out. The clinic's records say {npc} was never there.", tags: ["medic", "haunted"] },
  ],
  secret: [
    { text: "{short} and {npc} are the only two people alive who know what really happened during {event}. {npc} has started talking to {faction}." },
    { text: "Behind a panel in {short}'s ship that nobody checks sits {object} that belonged to {npc}. It should have been destroyed. Someone at {place} knows it wasn't." },
    { text: "{npc} recorded everything the night {short} came back to {place} with someone else's blood on {their} sleeves. The recording is insurance, and {npc} just raised the premium." },
    { text: "The name on {short}'s citizen record isn't the one {short} was born with. {npc} knows the real one, and exactly what {faction} would pay for it." },
    { text: "During {event}, {short} carried a sealed case out of {place} for {npc}, no questions asked. {faction} has been asking ever since." },
    { text: "{npc} pulled {object} from the wreck of {ship} near {place} and brought it to {short} first. Whatever is on it, people have already died for it." },
    { text: "{npc} still has the schematics {short} drew in the margins of a stolen microTech manual. One of them works. {faction} would kill for it.", tags: ["tinkerer"] },
  ],
  oath: [
    { text: "On the deck of a burning {ship_name}, {npc} made {short} swear to finish the job they'd started together. The job is still waiting at {place}." },
    { text: "{short} promised {npc} to keep someone safe through {event}. That someone was just seen at {place}, keeping very bad company." },
    { text: "{npc} saved {short}'s life on one condition: that one day {short} would return the favour, to anyone {npc} named. The name arrived last night." },
    { text: "Before {npc} went quiet, {short} gave {their} word to see {object} delivered to {place}. It's still in the hold." },
    { text: "{short} swore to {npc} never to work for {faction} again. This month's best offer has their seal on it." },
    { text: "{npc} and {short} carved two names into a bulkhead at {place} after {event}. {npc} made {short} promise there would never be a third.", tags: ["loyal", "survivor", "ex_military"] },
  ],
};

// Real places (and the lore thread each one pulls missions toward).
export const HOOK_PLACES = [
  { text: "Ruin Station", thread: "headhunters" }, { text: "Checkmate Station", thread: "headhunters" }, { text: "Orbituary", thread: "headhunters" },
  { text: "Patch City", thread: "frontier" }, { text: "Rat's Nest", thread: "frontier" }, { text: "Endgame station at Terminus", thread: "frontier" },
  { text: "Starlight Service Station", thread: "frontier" }, { text: "the homesteads of Bloom", thread: "frontier" }, { text: "Rustville, out in the Pyro I storms", thread: "asd" },
  { text: "Last Ditch on Monox", thread: "xenothreat" }, { text: "Chawla's Beach on Pyro IV", thread: "frontier" },
  { text: "GrimHEX", thread: "ninetails" }, { text: "Lorville", thread: "hurston" }, { text: "Orison", thread: "ninetails" }, { text: "Area18", thread: "terra" },
  { text: "New Babbage", thread: "asd" }, { text: "Everus Harbor", thread: "hurston" }, { text: "Port Tressler", thread: "asd" }, { text: "Baijini Point", thread: "terra" },
  { text: "Seraphim Station", thread: "ninetails" }, { text: "the Klescher Rehabilitation Facility on Aberdeen", thread: "hurston" }, { text: "the Yela belt", thread: "ninetails" },
  { text: "Levski", thread: "molina" }, { text: "the Glaciem Ring", thread: "vanduul_nyx" }, { text: "the Keeger Belt", thread: "shattered" },
  { text: "Prime, on Terra", thread: "terra" },
];

// Canon events whose aftermath is still IN THE GAME today, so a hook never points at content that has left
// (no Slicer raids, Nine Tails blockade, Jumptown, Boyd's execution, Fight for Pyro or Alliance Aid relief).
// Each one maps to something players can still go and see: the Onyx Facilities, the Lazarus labs and the
// Pyro I storms, the Siege of Orison, the QV stations in Nyx, Hathor's platforms, the Pyro gang war.
export const HOOK_EVENTS = [
  { text: "the shutdown of the Onyx Facilities", thread: "asd" },
  { text: "the scandal over Dr. Jorrit's research", thread: "asd" },
  { text: "the first wave of regen failures", thread: "asd" },
  { text: "the night the Apex Valakkar was first seen in the Pyro I storms", thread: "asd" },
  { text: "the Nine Tails' seizure of Orison's platforms", thread: "ninetails" },
  { text: "the Vanduul attacks on the QV stations in Nyx", thread: "vanduul_nyx" },
  { text: "the Shattered Blade's raid on a People's Alliance patrol", thread: "shattered" },
  { text: "the closing of the QV Breaker Stations in the Keeger Belt", thread: "shattered" },
  { text: "the collapse of Hathor's mining operation on Daymar", thread: "hurston" },
  { text: "the gang war between the Headhunters and the Citizens for Prosperity", thread: "headhunters" },
  { text: "the XenoThreat raids on the homesteads of Pyro", thread: "xenothreat" },
];

// Real ships (every one exists in the game).
export const HOOK_SHIPS = [
  "a Drake Cutlass Black", "a MISC Freelancer", "an Aegis Gladius", "an Anvil Carrack", "a Drake Caterpillar", "an RSI Constellation Andromeda",
  "a Drake Corsair", "a MISC Hull C", "an Aegis Vanguard", "a Crusader Mercury Star Runner", "an Origin 315p", "an Anvil Valkyrie",
  "a Drake Buccaneer", "an Esperia Prowler", "a MISC Prospector", "a Drake Vulture", "an Aegis Avenger Titan", "a Crusader Hercules",
];

// Objects that exist in the game.
export const HOOK_OBJECTS = [
  "a datapad", "an ASD maintenance keycard", "an irradiated Valakkar pearl", "a Specimen Cache Access card", "a Blue Security Keycard",
  "a compboard out of Checkmate", "a crate of medical gel", "a case of quantainium", "a sealed cargo box", "a med pen with one dose left",
];

// Real factions and companies.
export const HOOK_FACTIONS = [
  "the Headhunters", "the Nine Tails", "Rough & Ready", "the Citizens for Prosperity", "XenoThreat", "the Shattered Blade", "InterSec",
  "Hurston Security", "Crusader Security", "the Advocacy", "ASD", "the Bounty Hunters Guild", "the Hockrow Agency", "Red Wind Linehaul",
  "Covalex", "Shubin Interstellar", "the People's Alliance", "the Moraine gang",
];
