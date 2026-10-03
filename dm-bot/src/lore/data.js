// Structured lore for the procedural story engine. The prose codex lives in /lore/*.md
// (that's what the optional Claude writer reads); this file is the machine-usable subset:
// origins, name pools, playable locations and activities, factions, NPC pools, campaign templates.
// Keep it in sync with the codex when a patch adds or changes content.

export const CURRENT_YEAR = 2956;
export const CURRENT_PATCH = "Alpha 4.10";

// ── Careers: what the player actually does in game ────────────────────────────
export const CAREERS = {
  pilot: { label: "Fighter Pilot", emoji: "🛩️", activities: ["bounty", "patrol", "escort", "combat"] },
  hauler: { label: "Hauler / Trader", emoji: "📦", activities: ["haul", "delivery", "escort"] },
  miner: { label: "Miner", emoji: "⛏️", activities: ["mining", "haul", "investigate"] },
  bounty: { label: "Bounty Hunter", emoji: "🎯", activities: ["bounty", "fps", "investigate"] },
  marine: { label: "Mercenary / Marine", emoji: "🪖", activities: ["fps", "combat", "escort"] },
  medic: { label: "Medic / Rescue", emoji: "🩺", activities: ["rescue", "delivery", "fps"] },
  salvager: { label: "Salvager", emoji: "🔧", activities: ["salvage", "investigate", "haul"] },
  explorer: { label: "Explorer / Scout", emoji: "🔭", activities: ["investigate", "patrol", "exploration"] },
  smuggler: { label: "Smuggler", emoji: "🕶️", activities: ["delivery", "haul", "fps"] },
};

// ── Origins: background, name style, home, ties, starting hooks ──────────────
// {name} {home} etc. are filled by the engine.
export const ORIGINS = {
  hurston_worker: {
    label: "Hurston Debt-Worker",
    emoji: "🏭",
    names: "common",
    home: "Lorville, Hurston (Stanton)",
    system: "Stanton",
    citizenship: "civilian",
    ties: { friendly: ["Citizens for Prosperity"], hostile: ["Hurston Dynamics"] },
    story: [
      "{name} was born under the smog of Lorville, two levels below the Teasa Spaceport, to parents who built rifles on the Hurston Dynamics line. In a company town your contract is your life, and it's paid in company scrip.",
      "{short} was on the line by sixteen. By twenty {they} owed Hurston more than {they} could earn in a lifetime: housing, medical care, \"training fees\". Every shift made the debt bigger, not smaller.",
      "So one night {short} stole a shift-pass and took a seat on an outbound shuttle. Hurston calls that contract abandonment. {short} calls it the first free breath {they} ever took.",
    ],
    hooks: [
      { type: "debt", text: "Hurston Dynamics still holds {name}'s labour contract, and a collections agent named {npc} has been asking around the Stanton stations.", thread: "hurston" },
      { type: "lost", text: "{name}'s younger sibling {npc2} is still on the Lorville line, and the company is using them as leverage.", thread: "hurston" },
    ],
  },
  terran_noble: {
    label: "Terran Old-Money Heir",
    emoji: "🏛️",
    names: "terran",
    home: "Prime, Terra",
    system: "Terra",
    citizenship: "citizen",
    ties: { friendly: ["UEE Senate (Transitionalists)"], hostile: ["Earth loyalists"] },
    story: [
      "{name} grew up among the glass towers of Prime on Terra, where families count their wealth in Senate seats. For three generations the {surname} name has stood for one idea: the Empire's future belongs to Terra, not tired old Earth.",
      "When Senator Mira Ngo lost the 2950 election, {short}'s father lost a fortune backing her. A year later he lost his life too. The family calls it an accident. {short} never has.",
      "{short} left Prime with a family ship, an inheritance frozen by auditors, and one question: who profited when the {surname}s fell?",
    ],
    hooks: [
      { type: "secret", text: "{name}'s father was writing to a Terra Gazette journalist, {npc}, about Earth-loyalist money moving through Stanton megacorps.", thread: "terra" },
      { type: "enemy", text: "A family rival, {npc2}, bought the {surname} estate at auction and wants {name} out of the picture before the audit closes.", thread: "terra" },
    ],
  },
  pyro_outlaw: {
    label: "Pyro-Born Outlaw",
    emoji: "🔥",
    names: "pyro",
    home: "Ruin Station, Pyro",
    system: "Pyro",
    citizenship: "none",
    ties: { friendly: ["Rough & Ready"], hostile: ["Headhunters"] },
    story: [
      "{name} was born on Ruin Station, under a dying flare star, in a system the Empire forgot. In Pyro you learn early that the law is whoever has the most guns this week.",
      "{short} was running cargo for Rough & Ready before {they} could legally fly in the UEE. Then the Headhunters came to collect a debt the crew didn't owe, and burned their ship to make the point.",
      "{short} was the only one who walked away. These days {short} flies between the gangs, the Citizens for Prosperity and the odd Stanton job, and has never forgotten a single face from that night.",
    ],
    hooks: [
      { type: "enemy", text: "The Headhunter who burned {name}'s crew, {npc}, rose in the gang after Amelia Boyd's execution.", thread: "headhunters" },
      { type: "oath", text: "{name} swore to get the last survivor of the old crew, {npc2}, out of a Headhunter debt cell.", thread: "headhunters" },
    ],
  },
  navy_veteran: {
    label: "UEE Navy Veteran",
    emoji: "🎖️",
    names: "common",
    home: "Vega (served on the western front)",
    system: "Vega",
    citizenship: "citizen",
    ties: { friendly: ["UEE Navy", "Civilian Defense Force"], hostile: ["Vanduul"] },
    story: [
      "{name} enlisted at eighteen to earn {their} citizenship, and earned it at Vega in 2945, the day the Vanduul fell on Vega II and the sky burned.",
      "For three days straight {short} flew escort for evacuation transports. Not all of them made it out. Some nights the comms chatter still plays in {their} head.",
      "Now {short} has a medal, a citizenship chit and no patience for desk work. CDF call-ups, escort contracts, anything that keeps {their} hands on a stick.",
    ],
    hooks: [
      { type: "lost", text: "{name}'s wingmate {npc} was listed MIA at Vega. Last month a transmission arrived on a dead Navy channel, signed with their callsign.", thread: "vanduul" },
      { type: "secret", text: "{name} saw something at Vega the Navy redacted: a Vanduul ship that didn't fire, as if it were waiting. Officer {npc2} told {them} to forget it.", thread: "vanduul" },
    ],
  },
  tevarin: {
    label: "Tevarin Descendant",
    emoji: "🌀",
    names: "tevarin",
    home: "Elysium IV (Kaleeth), the lost homeworld",
    system: "Elysium",
    citizenship: "civilian",
    ties: { friendly: ["Tevarin diaspora"], hostile: ["XenoThreat"] },
    story: [
      "{name} carries a Tevarin name in a human empire. {Their} people lost two wars, and their homeworld Kaleeth with them. Humans call it Elysium IV now.",
      "{short}'s grandmother told the story of the last fleet at Elysium, which flew into the planet's shield rather than surrender. To humans it's a footnote in a history lesson. To the Tevarin it's a vow.",
      "{short} keeps the old honour code, which says a debt of honour outlives the one who made it. Then word came that a war-relic, the {relic}, had turned up in a collector's hands somewhere in the 'Verse.",
    ],
    hooks: [
      { type: "oath", text: "The {relic}, a Tevarin war-relic, has surfaced in the hands of {npc}, a dealer who sells to the highest bidder.", thread: "tevarin" },
      { type: "enemy", text: "XenoThreat survivors have marked {name} as a target. Their cell leader {npc2} is still out there.", thread: "xenothreat" },
    ],
  },
  levski_born: {
    label: "Levski-Born (People's Alliance)",
    emoji: "❄️",
    names: "levski",
    home: "Levski, Delamar (Nyx)",
    system: "Nyx",
    citizenship: "none",
    ties: { friendly: ["People's Alliance"], hostile: ["Intersec Defense Solutions"] },
    story: [
      "{name} was born inside an asteroid. Levski, in the Glaciem Ring of Nyx, was founded by people fleeing the Messer dictatorship who swore never to kneel to an Imperator again.",
      "{short} grew up on Alliance assemblies, air recyclers and the idea that you share what you have. Then the Molina Mold came in through the failing Gyson filters, and {short} watched neighbours cough themselves to death while the Assembly argued.",
      "Now {short} works the routes in and out of Nyx. Still loyal, but no longer sure the Alliance's ideals can survive the Mold, the UEE's cold shoulder and the Vanduul gathering at the Virgil jump.",
    ],
    hooks: [
      { type: "secret", text: "{name} found a shipping manifest showing the faulty Gyson filters were swapped in by a contractor, {npc}, a year before the outbreak.", thread: "molina" },
      { type: "lost", text: "{name}'s mentor {npc2} went out to scout the Virgil jump point and hasn't checked in.", thread: "vanduul_nyx" },
    ],
  },
  microtech_engineer: {
    label: "microTech Engineer",
    emoji: "🧊",
    names: "common",
    home: "New Babbage, microTech (Stanton)",
    system: "Stanton",
    citizenship: "citizen",
    ties: { friendly: ["microTech"], hostile: ["Associated Sciences & Development"] },
    story: [
      "{name} was a rising engineer at microTech in New Babbage, building the subsystems that make regen work.",
      "When the regen failures began, {short} filed an internal report linking them to data from an ASD partner lab called Onyx. The report disappeared. So did {their} security clearance.",
      "{short} freelances now, and knows more than is healthy about what happened inside ASD's Onyx facilities and about the missing Dr. Logan Jorrit.",
    ],
    hooks: [
      { type: "secret", text: "{name}'s buried report contains an Onyx facility code that the Hockrow Agency investigator {npc} would kill to see.", thread: "asd" },
      { type: "enemy", text: "An ASD fixer, {npc2}, has been told to make sure {name} never testifies.", thread: "asd" },
    ],
  },
  banu_trader: {
    label: "Raised Among Banu Traders",
    emoji: "🪙",
    names: "trader",
    home: "a Banu trading Souli (the Protectorate)",
    system: "Banu space",
    citizenship: "civilian",
    ties: { friendly: ["Banu traders", "Wikelo"], hostile: ["XenoThreat"] },
    story: [
      "{name} was raised by human traders who settled in a Banu Souli, where everything has a price and everyone is a potential partner.",
      "{short} could haggle in three languages before {they} could fly. {They} also learned that the Banu see contracts and ownership very differently from humans.",
      "Back in human space, {short} trades in the gaps: exotic goods, odd favours, and barter with Banu merchants like Wikelo, who always wants one more strange thing.",
    ],
    hooks: [
      { type: "debt", text: "{name} owes a Banu Souli a \"favour of equal weight\", and a Banu envoy, {npc}, has come to collect.", thread: "banu" },
      { type: "secret", text: "{name} brokered a sale that ended up arming the Frontier Fighters. Only {npc2} knows.", thread: "frontier" },
    ],
  },
};

// ── Name pools ─────────────────────────────────────────────────────────────
export const NAME_POOLS = {
  common: {
    first: ["Jace", "Mara", "Dex", "Ilse", "Rowan", "Kade", "Tamsin", "Orrin", "Vesna", "Cal", "Juno", "Rhett", "Niko", "Sable", "Ezra", "Lark", "Quinn", "Hollis", "Marek", "Tess", "Bram", "Callie", "Idris", "Wren"],
    last: ["Calder", "Voss", "Harlan", "Okafor", "Reyes", "Strand", "Mercer", "Kovač", "Brannigan", "Tanaka", "Hale", "Doyle", "Ashby", "Ferro", "Lindqvist", "Morrow", "Quill", "Barrow", "Navarro", "Oduya"],
  },
  terran: {
    first: ["Aurelia", "Cassius", "Seraphine", "Lucan", "Octavia", "Evander", "Isolde", "Thaddeus", "Valeria", "Corwin", "Imogen", "Remus", "Celestine", "Atticus"],
    last: ["Ashcombe", "Vanterpool", "Delacroix-Ngo", "Halloran", "Sterling-Ru", "Montclair", "Varga-Lune", "Whitlocke", "Castellane", "Rosewood", "Tremaine", "Okonkwo-Hale"],
  },
  pyro: {
    first: ["Rook", "Vex", "Cinder", "Jax", "Kesh", "Mags", "Tallow", "Rizzo", "Pike", "Nyla", "Scorch", "Dune", "Hex", "Rusty", "Sloane", "Brick"],
    last: ["Vance", "Kerr", "Black", "Mott", "Gage", "Rourke", "Slade", "Crane", "Holt", "Dray", "Fenn", "Rask"],
    callsigns: ["Flare", "Ashes", "Gutter", "Lucky", "Ghost", "Ruin", "Static", "Burnout", "Slag", "Jackal", "Viper", "Embers"],
  },
  tevarin: {
    first: ["Kehl'Varo", "Ithea'Sen", "Moru'Tal", "Ash'Kaleen", "Vereth'Ul", "Saan'Doro", "Ilu'Thaen", "Coren'Vash", "Tavi'Ruun", "Esh'Arin"],
    last: ["of House Vael", "of the Ninth Flight", "of Kaleeth's Line", "of House Doran'Thal", "of the Last Shield", "of House Ithren"],
  },
  levski: {
    first: ["Ilia", "Vesela", "Bogdan", "Mira", "Stoyan", "Neda", "Kaloyan", "Raina", "Petar", "Zora", "Danail", "Yana", "Emil", "Lyuba"],
    last: ["Dragan", "Petrova", "Levchev", "Marinov", "Kostadin", "Iliev", "Vasileva", "Radev", "Todorova", "Grozev"],
  },
  trader: {
    first: ["Soren", "Talia", "Marlo", "Ines", "Kasimir", "Odessa", "Benz", "Pell", "Yusra", "Tobin", "Nim", "Calla"],
    last: ["Dray", "Okoro", "Vantis", "Sallow", "Merriweather", "Quince", "Halvard", "Ost", "Benedek", "Kaari"],
    callsigns: ["Haggler", "Two-Price", "Souli", "Wikelo's Friend", "Scales", "Ledger", "Barter"],
  },
};

// NPCs the engine invents. Persisted per guild once created, so they recur.
export const NPC_POOL = {
  first: ["Dorian", "Kessa", "Varn", "Lio", "Maddox", "Grig", "Teodora", "Hank", "Saffi", "Oskar", "Renata", "Cobb", "Liesl", "Ambrose", "Fen", "Mirela", "Tycho", "Brigid", "Zane"],
  last: ["Krell", "Ashworth", "Vey", "Malloy", "Sorensen", "Duquesne", "Pike", "Varga", "Oyelaran", "Hask", "Morrigan", "Teague", "Lund", "Castell", "Rook", "Imbert"],
  roles: ["fixer", "informant", "smuggler", "CDF liaison", "Hockrow investigator", "Alliance assembly delegate", "Headhunter lieutenant", "corporate auditor", "bartender at Ruin Station", "salvage boss", "ASD lab tech", "Terra Gazette journalist", "Navy intelligence officer", "Banu envoy", "Intersec contractor", "Shattered Blade go-between"],
};

export const RELICS = ["Shield-Song Blade", "Ninth Flight Banner", "Corath'Thal's Signet", "Kaleeth Star-Chart", "Last Fleet Logstone"];

// ── Playable locations by system (current patch) ─────────────────────────────
export const LOCATIONS = {
  Stanton: {
    law: "lawful",
    places: [
      { name: "Lorville (Hurston)", tags: ["city", "social", "trade"] },
      { name: "Orison (Crusader)", tags: ["city", "social", "trade"] },
      { name: "Area18 (ArcCorp)", tags: ["city", "social", "trade"] },
      { name: "New Babbage (microTech)", tags: ["city", "social", "trade"] },
      { name: "GrimHEX (Yela belt)", tags: ["outlaw", "social", "trade"] },
      { name: "an Onyx Facility on Daymar", tags: ["fps", "investigate"] },
      { name: "an Onyx Facility on Cellin", tags: ["fps", "investigate"] },
      { name: "an Onyx Facility on Aberdeen", tags: ["fps", "investigate"] },
      { name: "the Kareah security station", tags: ["fps", "outlaw"] },
      { name: "the Yela asteroid belt", tags: ["mining", "salvage"] },
      { name: "the Aaron Halo belt", tags: ["mining", "salvage", "patrol"] },
      { name: "a derelict wreck site on Daymar", tags: ["salvage", "investigate"] },
      { name: "an outpost on microTech's ice fields", tags: ["delivery", "fps"] },
      { name: "a Lagrange-point station around ArcCorp", tags: ["trade", "patrol"] },
      { name: "the Inspiration Park platforms above Orison", tags: ["fps"] },
    ],
  },
  Pyro: {
    law: "lawless",
    places: [
      { name: "Ruin Station", tags: ["outlaw", "social", "trade"] },
      { name: "Checkmate Station", tags: ["outlaw", "social", "trade"] },
      { name: "Orbituary", tags: ["outlaw", "trade"] },
      { name: "Patch City", tags: ["outlaw", "social"] },
      { name: "a contested zone station", tags: ["fps", "outlaw"] },
      { name: "ASD data centres on Pyro IV", tags: ["fps", "investigate"] },
      { name: "an ASD facility in the Pyro I storms", tags: ["fps", "investigate"] },
      { name: "the asteroid fields around Pyro V", tags: ["mining", "salvage"] },
      { name: "a gang outpost on Bloom", tags: ["fps", "outlaw"] },
      { name: "a derelict settlement on Monox", tags: ["salvage", "investigate"] },
      { name: "Terminus", tags: ["patrol", "trade"] },
    ],
  },
  Nyx: {
    law: "unclaimed",
    places: [
      { name: "Levski (Delamar)", tags: ["city", "social", "trade"] },
      { name: "the Levski Municipal Works", tags: ["fps", "repair", "investigate"] },
      { name: "the Glaciem Ring", tags: ["mining", "patrol", "outlaw"] },
      { name: "an abandoned station in the Keeger Belt", tags: ["investigate", "fps", "salvage"] },
      { name: "a smuggler drop point in the Keeger Belt", tags: ["outlaw", "trade"] },
      { name: "the Nyx–Virgil jump point approach", tags: ["patrol", "combat"] },
      { name: "the Nyx–Pyro jump point", tags: ["patrol", "trade"] },
    ],
  },
};

export const CARGO = ["medical supplies", "Gyson air filters", "processed food", "agricultural supplies", "titanium", "laranite", "quantainium (handle with care)", "distilled spirits", "scrap", "stims", "water", "hydrogen fuel"];
export const ORES = ["quantainium", "laranite", "agricium", "bexalite", "taranite", "gold", "hephaestanite"];
export const EVIDENCE = ["a datapad", "a lab journal", "a security recording", "a blood-stained ID", "an encrypted drive", "a shipping manifest", "a regen-pod log"];

// ── Objective templates: each maps to something you can do in the PU ─────────
// {place} {system} {qty} {cargo} {ore} {evidence} {npc} {antagonist}
export const OBJECTIVES = {
  haul: [
    "Deliver at least {qty} SCU of {cargo} to {place} ({system}). A **Hauling** contract or a self-bought cargo run both count.",
    "Run {cargo} into {place}. Take a **Hauling** contract heading there and log the delivery.",
  ],
  delivery: [
    "Take a **Delivery** contract and get the package to {place} without losing it. In the story, it's {npc}'s message.",
    "Make a hand delivery to {place}: land, walk it in and hand it over. Bonus RP: say the code phrase out loud.",
  ],
  bounty: [
    "Take a **Bounty Hunter** contract in {system} and share it with the crew. In the story, the target flies for {antagonist}.",
    "Take a **Bounty Hunter** contract (pick the tier together) and bring the target down.",
  ],
  fps: [
    "Take a **Mercenary** contract to clear a site, or go into {place} on foot, and recover {evidence} (any datapad or loot crate counts).",
    "Storm {place}. Clear hostiles and hold the area for 2 minutes before extracting.",
  ],
  mining: [
    "Mine and refine at least {qty} SCU of {ore} around {place}. The money funds the next step of the plan.",
  ],
  salvage: [
    "Strip a hull near {place}: salvage at least {qty} SCU of RMC or construction material.",
  ],
  investigate: [
    "Go to {place} and find {evidence}. Take a screenshot of whatever you find as evidence.",
    "Search {place} for signs of {antagonist}'s people. An **Investigation** contract there fits, or just explore it.",
  ],
  patrol: [
    "Fly a patrol route: {place}, then two more points of interest in {system}. Report any contacts you meet.",
  ],
  escort: [
    "Escort a crewmate's **Hauling** run to {place}. Flying solo? Take a **Mercenary** contract near the route.",
  ],
  combat: [
    "Take a **Mercenary** or **Bounty Hunter** ship-combat contract in {system}. In the story, these are {antagonist}'s raiders.",
  ],
  rescue: [
    "Answer a **Service Beacon** or **ECN** alert in {system}, or take a **Search** contract (or fly a med-bed ship to a crewmate in trouble).",
  ],
  exploration: [
    "Visit {place} and log one thing nobody in your crew has seen before. Screenshot it.",
  ],
  rp: [
    "RP scene at {place}: meet {npc}. A crewmate can play {npc}, or read the DM's lines.",
  ],
};

// Which location tags suit which activity.
export const ACTIVITY_TAGS = {
  haul: ["trade", "city"], delivery: ["city", "trade", "outlaw"], bounty: ["patrol", "outlaw"],
  fps: ["fps"], mining: ["mining"], salvage: ["salvage"], investigate: ["investigate"],
  patrol: ["patrol"], escort: ["trade", "patrol"], combat: ["patrol", "combat", "outlaw"],
  rescue: ["patrol", "fps"], exploration: ["investigate", "patrol"], rp: ["social"],
};

// ── Campaign templates (end goals) ───────────────────────────────────────────
export const CAMPAIGN_GOALS = {
  uncover: {
    label: "Uncover: a mystery",
    emoji: "🕵️",
    titles: ["The {macguffin} Files", "What {antagonist} Buried", "Signal in the Static"],
    endGoal: "Expose the truth behind the {macguffin} and confront {antagonist}.",
    acts: [
      { title: "The First Thread", beat: "A strange lead surfaces and {patron} asks the crew to look into it.", activities: ["investigate", "delivery", "rp"] },
      { title: "Following the Money", beat: "The trail leads into a shady corporate or gang operation. Someone is covering it up.", activities: ["fps", "investigate", "haul"] },
      { title: "Burned", beat: "{antagonist} learns about the crew and strikes back.", activities: ["combat", "bounty", "escort"] },
      { title: "The Vault", beat: "The crew finds where the proof is kept and breaks in.", activities: ["fps", "investigate"] },
    ],
    finale: "Showdown with {antagonist} and the truth about the {macguffin}.",
    macguffins: ["Onyx Ledger", "Hyperion Logs", "Gyson Contract", "Vega Redaction", "Jorrit Cache"],
  },
  build: {
    label: "Build: save a place",
    emoji: "🛠️",
    titles: ["Lifeline for {place}", "Hold the Line at {place}", "Before the Storm"],
    endGoal: "Get {place} ready to survive the coming threat from {antagonist}.",
    acts: [
      { title: "The Ask", beat: "{patron} explains how bad things are and what's needed.", activities: ["haul", "delivery", "rp"] },
      { title: "Supply Run", beat: "Raw materials and funds have to come from somewhere.", activities: ["mining", "salvage", "haul"] },
      { title: "Sabotage", beat: "Someone doesn't want {place} to recover.", activities: ["investigate", "fps", "escort"] },
      { title: "The Wall", beat: "Final defences go up as {antagonist} approaches.", activities: ["combat", "haul", "patrol"] },
    ],
    finale: "{antagonist} hits {place}. Does it hold?",
    macguffins: ["Air Grid", "Defence Grid", "Med Bay", "Comms Array"],
  },
  rise: {
    label: "Rise: build your reputation",
    emoji: "👑",
    titles: ["Crown of {system}", "The {macguffin} Gambit", "Up from the Gutter"],
    endGoal: "Become the crew no one in {system} can ignore, and take the {macguffin} from {antagonist}.",
    acts: [
      { title: "Proving Ground", beat: "{patron} offers a test job.", activities: ["delivery", "bounty", "haul"] },
      { title: "Made", beat: "The crew earns a place at the table, and makes enemies.", activities: ["fps", "combat", "delivery"] },
      { title: "Knives Out", beat: "{antagonist} moves against the crew's patron.", activities: ["bounty", "escort", "investigate"] },
      { title: "The Seat", beat: "A final play for the {macguffin}.", activities: ["fps", "combat"] },
    ],
    finale: "Take the {macguffin} and decide what kind of power you'll be.",
    macguffins: ["Ruin Station Charter", "Checkmate Ledger", "GrimHEX Docking Rights", "Keeger Drop Network"],
  },
  hunt: {
    label: "Hunt: bring down a target",
    emoji: "🎯",
    titles: ["The Hunt for {antagonist}", "Last Call for {antagonist}", "Dead or Alive"],
    endGoal: "Find and take down {antagonist}, one lieutenant at a time.",
    acts: [
      { title: "The Contract", beat: "{patron} puts up the bounty and gives the first lead.", activities: ["investigate", "rp", "bounty"] },
      { title: "First Lieutenant", beat: "Take down the muscle.", activities: ["bounty", "combat"] },
      { title: "Second Lieutenant", beat: "Take down the money.", activities: ["fps", "investigate"] },
      { title: "Cornered", beat: "{antagonist}'s last hideout is found.", activities: ["fps", "combat", "patrol"] },
    ],
    finale: "Face {antagonist}: arrest, execution, or something else?",
    macguffins: ["Bounty Warrant", "Kill List", "Lieutenant Roster"],
  },
  protect: {
    label: "Protect: get someone to safety",
    emoji: "🛡️",
    titles: ["The Long Way to {place}", "Running Silent", "Precious Cargo"],
    endGoal: "Get {npc} safely to {place}, past everything {antagonist} throws at the crew.",
    acts: [
      { title: "The Package", beat: "{patron} hands over the person (or thing) that must survive.", activities: ["rp", "delivery", "fps"] },
      { title: "On the Run", beat: "The crew is hunted across the system.", activities: ["escort", "combat", "patrol"] },
      { title: "Safe House", beat: "A hideout is needed, but who can be trusted?", activities: ["delivery", "haul", "investigate"] },
      { title: "The Gauntlet", beat: "Final run through {antagonist}'s blockade.", activities: ["escort", "combat"] },
    ],
    finale: "The last jump to {place}.",
    macguffins: ["Witness", "Defector", "Cure Sample", "Data Courier"],
  },
};

// Canon threads used to colour campaigns (see /lore/05-dm-hooks.md).
export const THREADS = {
  asd: { label: "ASD & the Regen Crisis", systems: ["Stanton", "Pyro"], antagonists: ["an ASD cleanup crew", "Dr. Jorrit's loyalists"] },
  frontier: { label: "Frontier Fighter remnants", systems: ["Pyro", "Stanton"], antagonists: ["a Frontier Fighter splinter cell"] },
  headhunters: { label: "The Headhunters ascendant", systems: ["Pyro"], antagonists: ["a Headhunter warband"] },
  molina: { label: "Molina Mold & the Gyson filters", systems: ["Nyx"], antagonists: ["a corrupt contractor ring"] },
  vanduul_nyx: { label: "Vanduul at the Virgil jump", systems: ["Nyx"], antagonists: ["a Vanduul raiding clan"] },
  vanduul: { label: "The Vanduul war", systems: ["Nyx"], antagonists: ["a Vanduul raiding clan"] },
  ninetails: { label: "Nine Tails resurgence", systems: ["Stanton"], antagonists: ["a Nine Tails crew"] },
  terra: { label: "Earth vs Terra", systems: ["Stanton"], antagonists: ["Earth-loyalist operatives"] },
  hurston: { label: "Hurston's company town", systems: ["Stanton"], antagonists: ["Hurston Security"] },
  xenothreat: { label: "XenoThreat survivors", systems: ["Pyro", "Stanton"], antagonists: ["a XenoThreat cell"] },
  tevarin: { label: "Tevarin honour", systems: ["Stanton", "Pyro"], antagonists: ["a relic collector's hired guns"] },
  banu: { label: "Banu bargains", systems: ["Pyro", "Nyx"], antagonists: ["a rival trading house"] },
  shattered: { label: "The Shattered Blade", systems: ["Nyx"], antagonists: ["the Shattered Blade"] },
};

// Galactic news headlines for /comms news, drawn from the live arcs.
export const NEWS = [
  "TERRA GAZETTE: Hockrow Agency's Arken Mallor says the Onyx investigation is \"far from over\" as more regen failures are reported.",
  "LEVSKI ASSEMBLY: Molina Mold cases fall after the emergency filter shipments, but the Municipal Works repairs are behind schedule.",
  "CDF BULLETIN: Volunteers still needed to clear Nine Tails holdouts from Orison's Inspiration Park platforms.",
  "NYX WATCH: More Vanduul signatures logged near the Virgil jump point. The Alliance won't comment on UEE assistance.",
  "PYRO RUMOUR MILL: With Amelia Boyd dead, the Headhunters are pushing hard into stations once held by Rough & Ready.",
  "IMPERIAL NEWS: Imperator Addison defends her AI-research reforms before the Senate. Terra delegates call them overdue.",
  "ASD STATEMENT: Associated Sciences & Development \"cooperates fully\". Dr. Logan Jorrit's whereabouts are still unknown.",
  "ALIEN AFFAIRS: Xi'an trade delegations report harassment near Stanton. XenoThreat sympathisers suspected.",
  "CASTRA: Sherman's fortress city prepares for an influx of civilians as Castra opens wider to traffic.",
];

// ── One-shot missions (/mission) ─────────────────────────────────────────────
export const MISSION_TYPES = {
  heist: { label: "Heist", emoji: "💼", activities: ["fps", "delivery", "investigate"], hooks: [
    "{patron} needs something stolen from {antagonist}, and it has to be gone before the next shift change.",
    "{antagonist} is sitting on a vault of evidence. {patron} wants it emptied, quietly.",
  ] },
  bounty: { label: "Bounty Hunt", emoji: "🎯", activities: ["bounty", "combat", "investigate"], hooks: [
    "{antagonist} skipped out on {patron}. Alive is worth more, but dead still pays.",
    "{patron} has a name and a price: {antagonist}. Nobody who went after them has come back.",
  ] },
  salvage: { label: "Salvage Mystery", emoji: "🔧", activities: ["salvage", "investigate", "fps"], hooks: [
    "A wreck turned up where no wreck should be. {patron} wants to know who it belonged to before {antagonist} gets there.",
    "{patron} picked up a beacon from a ship that was reported destroyed years ago. {antagonist} wants it silenced.",
  ] },
  rescue: { label: "Rescue", emoji: "🩺", activities: ["rescue", "fps", "escort"], hooks: [
    "{patron}'s people are pinned down, and {antagonist} is closing in. Time is the enemy.",
    "Someone {patron} cares about is being held by {antagonist}. Get them out.",
  ] },
  smuggle: { label: "Smuggling Run", emoji: "🕶️", activities: ["delivery", "haul", "escort"], hooks: [
    "{patron} has cargo that can't be scanned and a buyer who won't wait. {antagonist} is watching the lanes.",
    "Get {patron}'s package through. Don't open it. {antagonist} would kill to know what's inside.",
  ] },
  defense: { label: "Hold the Line", emoji: "🛡️", activities: ["combat", "patrol", "escort"], hooks: [
    "{antagonist} is about to hit {patron}'s operation. The crew is the only thing standing in the way.",
    "{patron} needs the convoy to make it. {antagonist} has other plans.",
  ] },
};

export const MISSION_TWISTS = [
  "{patron} set the whole thing up and was using the crew as bait.",
  "{antagonist} is not the real enemy. They were trying to warn someone.",
  "The cargo or target is alive, and it's asking for help.",
  "Someone close to the crew has been selling their position to {antagonist}.",
  "The job is a test. A bigger player is watching who survives.",
];

// The DM's voice. Server admins can rewrite it with /dm-admin persona.
export const DEFAULT_PERSONA =
  "You are \"Relay\", an information broker nobody has ever seen in person. You run jobs over encrypted comms from " +
  "somewhere in the Keeger Belt. Your voice is gravelly, dry and amused, the voice of someone who has seen a hundred crews " +
  "come and go. You call the players \"spacers\", you know everyone's business, and you never quite say whose side you're on. " +
  "You care about the crews you hire more than you'll admit.";

// ── The game is part of the story (see /lore/06-game-as-rp.md) ───────────────
// Each rule turns a Star Citizen limitation into fiction. `tags` = activities it's most relevant to.
export const GAME_RULES = [
  { tags: ["all"], short: "30k / disconnect", text: "**30k or disconnect?** You were pulled off-grid by a comms blackout. When you're back, tell the crew where you were." },
  { tags: ["fps", "combat", "bounty", "rescue"], short: "Death", text: "**Died?** That's regen, and it costs your imprint. Give your character a small echo (a twitch, a lost memory). Three deaths on one job leave a lasting scar." },
  { tags: ["combat", "escort", "patrol", "bounty"], short: "Desync", text: "**Desync or ships teleporting?** The enemy is spoofing your sensors. Call it out in character." },
  { tags: ["haul", "delivery", "salvage", "mining"], short: "Freight elevator", text: "**Freight elevator broken?** Customs hold or sabotage. Someone talks to the dockmaster (a bribe or a shouting match), or you reroute to another station." },
  { tags: ["haul", "delivery", "fps"], short: "Item banks", text: "**Gear stuck at another station?** Gear is physical. Plan the supply run, or borrow from a crewmate." },
  { tags: ["combat", "escort", "bounty", "patrol"], short: "Insurance claim", text: "**Ship blown up?** It's \"in the shop\" with a suspicious insurer. Fly a loaner and owe someone a favour." },
  { tags: ["bounty", "fps", "delivery", "combat"], short: "CrimeStat", text: "**Got a CrimeStat?** You're a fugitive now. Lie low at GrimHEX or Ruin Station, or get smuggled in by the crew." },
  { tags: ["fps", "investigate", "bounty", "salvage"], short: "Bugged objective", text: "**Target didn't spawn or the objective bugged?** Bad intel, or someone got there first. Report it; it becomes part of the twist." },
  { tags: ["haul", "delivery", "escort", "patrol", "exploration"], short: "Quantum travel", text: "**Long quantum jump?** That's the time to talk in character: plans, doubts, old stories." },
  { tags: ["all"], short: "Other players", text: "**Random players showed up?** They're in the story now. Hostile ones were hired by the other side; helpful ones become contacts." },
  { tags: ["fps", "combat", "rescue"], short: "Dumb NPCs", text: "**T-posing or clueless guards?** Cheap hired guns on bargain stims. Mock them, but cheap guns still kill." },
  { tags: ["all"], short: "Mission contracts", text: "**Which contract?** The shared one: one of you accepts it and shares it with the party. Its listing is the cover; the real job is this one." },
];

// How two NPCs from different players' stories turn out to be connected.
export const NPC_LINKS = [
  "{x} and {y} used to fly together, until one of them sold the other out.",
  "{x} owes {y} a debt that can't be paid in credits.",
  "{x} has been quietly paying {y} to keep a secret.",
  "{x} and {y} are working together, and neither of you knew.",
  "{y} is the only person {x} has ever been afraid of.",
  "{x} and {y} were lovers once. It ended badly enough that people still talk about it.",
  "{y} saved {x}'s life years ago, and {x} hasn't forgiven them for it.",
];

export const KIN_RELATIONS = ["older sibling", "younger sibling", "twin", "half-sibling", "cousin", "estranged sibling"];

// Factions that can put family members on opposite sides, by system.
export const SIDES = {
  Stanton: ["the Nine Tails", "Crusader Security", "the CDF", "Hurston Security"],
  Pyro: ["the Headhunters", "Rough & Ready", "the Citizens for Prosperity", "a Frontier Fighter cell"],
  Nyx: ["the People's Alliance militia", "the Shattered Blade", "Intersec Defense Solutions", "Keeger Belt smugglers"],
};

export const MISSION_STAKES = {
  heist: ["If it works, {antagonist} loses their leverage. If it fails, they'll know exactly who came for it.", "Get it out clean and the crew owns a secret worth a fortune. Get caught and {antagonist} owns you."],
  bounty: ["Bring {antagonist} down and {target} stops looking over their shoulder. Miss, and {antagonist} goes to ground and comes back angry.", "The bounty pays well. What {antagonist} knows might be worth more."],
  salvage: ["Whatever's in that wreck, {antagonist} wants it buried. Get to it first.", "The wreck has answers about {target}. Somebody doesn't want them found."],
  rescue: ["{target} is out of time. Every minute you spend arguing is one they don't have.", "Get {target} out and they'll owe the crew everything. Leave them, and {antagonist} gets whatever they know."],
  smuggle: ["Deliver and the crew is trusted on this route. Get scanned and {antagonist} learns what you're carrying.", "The cargo matters to {target} more than they'll say. Don't open it. Probably."],
  defense: ["Hold, and {target} owes the crew. Break, and {antagonist} takes everything.", "This is the line. {antagonist} is counting on you not to hold it."],
};

export const TITLE_WORDS = {
  a: ["Cold", "Dead", "Quiet", "Burning", "Broken", "Silent", "Last", "Red", "Hollow", "Blind", "Long", "Iron", "Black", "Pale", "Bitter", "Lost", "Crooked", "Sunken"],
  b: ["Lanes", "Signal", "Ledger", "Harbour", "Debt", "Light", "Orbit", "Contract", "Ashes", "Static", "Vault", "Tide", "Wake", "Promise", "Cargo", "Frontier", "Echo", "Margin"],
};

// ── Real contracts (Alpha 4.10). Contract Manager tabs: Bounty Hunter, Delivery, Hauling, Investigation,
// Mercenary, Maintenance, Search, Service Beacon, ECN, Appointment, Racing, PVP. Contract names and
// givers shift between patches, so these point at tabs and kinds of jobs rather than exact titles.
export const SHARE_HOW = "One of you accepts it, then mobiGlas → Contracts → **Accepted** → **Share**. Everyone gets the same waypoint, and pay and rep are split. Quantum-link to jump together.";

export const CONTRACT_GUIDE = {
  haul: "**Hauling** tab (Covalex, Ling Family Hauling, Red Wind Linehaul): pick up at a freight elevator, deliver to another. Or buy cargo at a trade terminal and run it yourself.",
  delivery: "**Delivery** tab: small packages you carry by hand or in a ship box, from one location to another.",
  bounty: "**Bounty Hunter** tab, ranked by threat (VLRT up to VHRT/ERT). Pick a tier your crew can handle. Pyro gangs offer them by reputation.",
  fps: "**Mercenary** tab: clear or defend a bunker or outpost (e.g. Defend Occupants), or an **Investigation** contract at an Onyx Facility. In Pyro, contested zones need no contract.",
  mining: "No contract is needed: mine by ship, ROC or hand, refine at a station refinery, and sell. Some givers (e.g. Recco Battaglia) post mining work.",
  salvage: "Salvage contracts (e.g. Adagio Holdings), or strip any wreck you find and sell the RMC/CMAT at a station.",
  investigate: "**Investigation** tab (Hockrow Agency's Onyx/Jorrit dossier missions and similar) or **Search** tab (missing persons).",
  patrol: "No contract is needed: fly the route. Pick up a **Bounty Hunter** or **Mercenary** job on the way to make it pay.",
  escort: "A crewmate's hauling run is the escort. For a stand-in, use a **Mercenary** defend job near the route.",
  combat: "**Bounty Hunter** (ship targets) or **Mercenary** ship-combat contracts. Vanduul-tech smugglers and Vanduul turn up in Nyx.",
  rescue: "**Search** tab (missing persons), **ECN** alerts, or answer a **Service Beacon**. A crewmate can also create a beacon at the spot.",
  exploration: "No contract is needed: fly there and look around.",
  rp: "No contract is needed: meet up in person at the location.",
};

// One shared contract anchors each mission: its destination stands in for the story's location.
export const ANCHORS = {
  heist: [
    { contract: "a **Mercenary** contract to clear a bunker or outpost", standIn: "The site is {antagonist}'s vault. Whatever loot or datapad you pull out is what you came for." },
    { contract: "an **Investigation** contract at an Onyx Facility (Stanton) or ASD site", standIn: "The facility is where {antagonist} hid the evidence. The data you recover is the prize." },
  ],
  bounty: [
    { contract: "a **Bounty Hunter** contract (pick the tier together)", standIn: "The bounty target is {antagonist}, or their right hand. The kill or capture is the story beat." },
  ],
  salvage: [
    { contract: "a salvage contract, or any derelict you find together", standIn: "The wreck is the ship tied to {target}. What you find in its cargo or on its crew is the clue." },
    { contract: "an **Investigation** contract at a derelict or abandoned site", standIn: "The site is where {target}'s trail goes cold. Search it like you mean it." },
  ],
  rescue: [
    { contract: "a **Search** contract (missing person)", standIn: "The missing person is {target}, or someone who knows where they are." },
    { contract: "an **ECN** alert or a **Service Beacon**", standIn: "The beacon is {target}'s distress call. Whoever's shooting at it works for {antagonist}." },
  ],
  smuggle: [
    { contract: "a **Hauling** contract", standIn: "The cargo is {target}'s package. The legal manifest is the cover." },
    { contract: "a **Delivery** contract", standIn: "The package is what {target} needs moved. Don't let {antagonist}'s people near it." },
  ],
  defense: [
    { contract: "a **Mercenary** defend contract (e.g. Defend Occupants)", standIn: "The site is {target}'s operation, and the attackers are {antagonist}'s people." },
    { contract: "a **Hauling** contract flown as a convoy", standIn: "The hauler is {target}'s convoy. Everyone else flies escort. Any attackers are {antagonist}'s." },
  ],
};

// What each career does on a shared job (no extra contract needed).
export const ROLES = {
  pilot: "Flies cover and gets the crew in and out. You call the approach.",
  hauler: "Brings the cargo ship and handles anything that needs moving. You own the freight elevator problem.",
  miner: "Brings tools and a sharp eye for the terrain. If there's a rock to crack or a way through, it's yours.",
  bounty: "Tracks the target and makes the call on taking them alive. You read the bounty intel.",
  marine: "First through the door. You lead on foot.",
  medic: "Keeps everyone breathing. Bring medpens and a med bed if you have one, and stay close to the guns.",
  salvager: "Strips what matters from the site or wreck, and knows what's worth taking.",
  explorer: "Scouts ahead. You spot the trouble before it spots the crew.",
  smuggler: "Knows the back way in and how to talk past security. Hide what needs hiding.",
};

// A meeting point for the crew: a real place that stands in for the story's rendezvous.
export const RENDEZVOUS = {
  Stanton: ["GrimHEX (Yela)", "Area18", "Lorville", "New Babbage", "Orison", "an ArcCorp Lagrange station"],
  Pyro: ["Ruin Station", "Checkmate Station", "Orbituary", "Patch City"],
  Nyx: ["Levski"],
};
