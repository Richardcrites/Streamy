// Story hooks, assembled from parts: WHO the person is to the character, WHAT they're doing now, and WHERE
// they are (a real place, which also decides the lore thread missions pull on). Parts are chosen to fit
// the player's own words (traits read from their story) and the least-used parts on the server win, so no
// two characters get the same hook. {npc} the NPC's name, {short} the character, {them}/{their} pronouns.
// NPCs are always referred to by name, never by pronoun.

export const HOOK_TYPES = ["enemy", "debt", "lost", "secret", "oath"];

// Who the NPC is to the character. tags: traits from the player's words that pull this one forward.
export const HOOK_ROLES = [
  { text: "an old crewmate from {short}'s first real job", tags: [] },
  { text: "the mechanic who kept {short}'s first ship flying", tags: ["tinkerer", "ace"] },
  { text: "a fixer {short} used to run cargo for", tags: ["criminal", "debt"] },
  { text: "{short}'s former business partner", tags: ["ambitious", "fallen_rich"] },
  { text: "a cousin {short} hasn't spoken to in years", tags: ["lost_family", "loner"] },
  { text: "the medic who patched {short} up after the worst night of {their} life", tags: ["survivor", "haunted"] },
  { text: "a bounty hunter who once let {short} go", tags: ["criminal", "runaway"] },
  { text: "the instructor who washed {short} out of flight school", tags: ["ace", "vengeance"] },
  { text: "a smuggler {short} owes more than money", tags: ["debt", "criminal"] },
  { text: "a kid {short} pulled out of a wreck, all grown up now", tags: ["loyal", "survivor", "medic"] },
  { text: "the club owner who booked {short}'s last show", tags: ["joker", "artist"] },
  { text: "the heckler who filmed {short}'s last routine and sold it", tags: ["joker"] },
  { text: "the talent agent who promised {short} the Empire and delivered a debt", tags: ["joker", "artist", "debt"] },
  { text: "{short}'s old squadron leader", tags: ["ex_military"] },
  { text: "a Navy investigator who never closed {short}'s file", tags: ["ex_military", "criminal"] },
  { text: "the gang boss {short} used to run errands for", tags: ["criminal", "runaway"] },
  { text: "a cellmate from Klescher who knows {short}'s real name", tags: ["criminal"] },
  { text: "the dealer at Checkmate who knows exactly how {short} cheats", tags: ["gambler"] },
  { text: "the engineer who stole credit for {short}'s best design", tags: ["tinkerer", "vengeance"] },
  { text: "the producer who still owns the rights to {short}'s songs", tags: ["artist"] },
  { text: "the auditor who froze {short}'s family accounts", tags: ["fallen_rich", "vengeance"] },
  { text: "a preacher who took {short} in when nobody else would", tags: ["faith", "runaway"] },
  { text: "the pathfinder who drew {short}'s first starmap", tags: ["explorer"] },
  { text: "the friend {short} swore to keep safe", tags: ["loyal"] },
  { text: "a doctor who covered up {short}'s last regen", tags: ["medic", "haunted"] },
  { text: "the stranger who paid {short}'s family debts and never left a name", tags: ["lost_family", "debt"] },
  { text: "a sibling who took the other road out of home", tags: ["lost_family", "runaway"] },
  { text: "{short}'s first captain", tags: ["ace", "loyal"] },
];

// What the NPC is doing now, by hook type.
export const HOOK_EVENTS = {
  enemy: [
    "has put a quiet price on {short}'s head",
    "blames {short} for what went wrong, and has finally tracked {them} down",
    "has started buying up {short}'s debts, one by one",
    "is telling everyone a version of the story where {short} is the villain",
    "just took a contract that puts them on the other side of {short}'s next job",
    "wants back what {short} took on the way out, and isn't asking nicely",
  ],
  debt: [
    "has called in the favour {short} never thought would be collected",
    "wants paying back with a job, not credits",
    "covered for {short} once and now needs the same, no questions asked",
    "is holding something of {short}'s as collateral until the debt is settled",
    "sold {short}'s debt on to someone much worse",
  ],
  lost: [
    "went quiet two weeks ago, mid-sentence",
    "missed every check-in since the last job",
    "sent one last message, half of it static, and then vanished",
    "was taken off a ship in broad daylight, and nobody is looking",
    "turned up on a missing-persons list under a different name",
  ],
  secret: [
    "knows what really happened on {short}'s last big job",
    "kept a recording {short} would very much like destroyed",
    "is the only other person alive who knows {short}'s real name",
    "has a datapad with {short}'s name on it and won't say where it came from",
  ],
  oath: [
    "made {short} promise to finish one last job for them",
    "is owed a promise {short} made on a very bad night",
    "asked {short} to look after someone, and that someone is now in trouble",
  ],
};

// Where they are: a real place, and the lore thread it pulls missions toward.
export const HOOK_PLACES = [
  { text: "Ruin Station", thread: "headhunters" }, { text: "Checkmate Station", thread: "headhunters" }, { text: "Rat's Nest", thread: "frontier" },
  { text: "Patch City", thread: "frontier" }, { text: "Shepherd's Rest on Bloom", thread: "frontier" }, { text: "Last Ditch on Monox", thread: "xenothreat" },
  { text: "GrimHEX", thread: "ninetails" }, { text: "Lorville", thread: "hurston" }, { text: "New Babbage", thread: "asd" }, { text: "Orison", thread: "ninetails" },
  { text: "Area18", thread: "terra" }, { text: "an Onyx Facility on Daymar", thread: "asd" }, { text: "Levski", thread: "molina" },
  { text: "the Keeger Belt", thread: "shattered" }, { text: "the Glaciem Ring", thread: "vanduul_nyx" },
];

// How the place is said, by hook type.
export const HOOK_WHERE = {
  enemy: ["Last seen at {place}.", "Word is they're working out of {place}.", "They've been asking about {short} at {place}."],
  debt: ["They're waiting at {place}.", "They want to meet at {place}.", "The message came from {place}."],
  lost: ["The last trace came from {place}.", "Someone saw them at {place}, once.", "Their ship's transponder last pinged near {place}."],
  secret: ["They're keeping it somewhere near {place}.", "They live quietly at {place} now.", "They've been seen at {place}, talking to the wrong people."],
  oath: ["It all starts at {place}.", "The job is waiting at {place}.", "They're at {place}, out of time."],
};
