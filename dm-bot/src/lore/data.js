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
  first: ["Dorian", "Kessa", "Varn", "Lio", "Maddox", "Ysolde", "Grig", "Teodora", "Hank", "Saffi", "Oskar", "Renata", "Cobb", "Liesl", "Ambrose", "Fen", "Mirela", "Tycho", "Brigid", "Zane"],
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
    "Deliver at least {qty} SCU of {cargo} to {place} ({system}). A hauling contract or a self-bought cargo run both count.",
    "Run {cargo} into {place}. Take a hauling contract heading there and log the delivery.",
  ],
  delivery: [
    "Take a courier/delivery contract and get the package to {place} without losing it. In the story, it's {npc}'s message.",
    "Make a hand delivery to {place}: land, walk it in and hand it over. Bonus RP: say the code phrase out loud.",
  ],
  bounty: [
    "Complete a bounty contract in {system}. In the story, the target flies for {antagonist}.",
    "Hunt: take a bounty contract (any tier) and bring the target down. Screenshot the kill confirmation for your log.",
  ],
  fps: [
    "Clear {place} on foot and recover {evidence} (any datapad or loot crate you find counts).",
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
    "Search {place} for signs of {antagonist}'s people: take an investigation or recovery contract there, or explore it freely.",
  ],
  patrol: [
    "Fly a patrol route: {place}, then two more points of interest in {system}. Report any contacts you meet.",
  ],
  escort: [
    "Escort a crewmate's cargo run to {place}. If you're flying solo, take a defence or escort contract in {system}.",
  ],
  combat: [
    "Take a ship-combat contract in {system}. In the story, these are {antagonist}'s raiders.",
  ],
  rescue: [
    "Answer a rescue or medical beacon in {system} (or carry a med-bed ship to a crewmate in trouble).",
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
