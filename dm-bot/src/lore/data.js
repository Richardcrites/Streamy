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
    openings: [
      "{name} was born under the smog of Lorville, two levels below the Teasa Spaceport, to parents who built rifles on the Hurston Dynamics line. In a company town your contract is your life, and it's paid in company scrip.",
      "{name} grew up in the worker blocks on the edge of Lorville, where the sky is the colour of rust and the lights go out when Hurston says so. {Their} mother ran a noodle stall for the night shift; {their} father ran up debts.",
      "{name} came to Hurston as a kid, when {their} family signed a ten-year labour contract for passage off a dying colony. Ten years became twenty. In Lorville, contracts have a way of growing.",
    ],
    turns: [
      "{short} was on the line by sixteen. By twenty {they} owed Hurston more than {they} could earn in a lifetime: housing, medical care, \"training fees\". Every shift made the debt bigger, not smaller.",
      "An accident on the munitions floor took three fingers from {short}'s best friend and nothing from the company's profits. When {short} filed a complaint, Hurston Security filed one back: theft of company property.",
      "{short} learned to fix the security drones that patrol the worker blocks, and learned their blind spots in the process. That knowledge became a side business, and the side business became a problem.",
    ],
    nows: [
      "So one night {short} stole a shift-pass and took a seat on an outbound shuttle. Hurston calls that contract abandonment. {short} calls it the first free breath of {their} life.",
      "{short} left Hurston in the back of a cargo hauler, under a crate of medical gel, with a forged discharge chit. It held up long enough. Now the 'Verse is big, and Lorville feels small and far away, most days.",
      "These days {short} works anywhere that isn't Hurston. The debt is still on the books, and somewhere in Lorville a ledger still has {their} name on it.",
    ],
    hooks: [
      { type: "debt", text: "Hurston Dynamics still holds {name}'s labour contract, and a collections agent named {npc} has been asking around the Stanton stations.", thread: "hurston" },
      { type: "lost", text: "{name}'s younger sibling, who took their mother's name ({npc}), is still on the Lorville line, and the company is using them as leverage.", thread: "hurston" },
      { type: "enemy", text: "{npc}, the Hurston Security sergeant who made {short}'s last year in Lorville hell, has just been put in charge of the outbound docks.", thread: "hurston" },
      { type: "secret", text: "{short} walked out with a datapad of Hurston safety reports the company swore were destroyed. {npc}, a union organiser in hiding, wants it.", thread: "hurston" },
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
    openings: [
      "{name} grew up among the glass towers of Prime on Terra, where families count their wealth in Senate seats. For three generations the {surname} name has stood for one idea: the Empire's future belongs to Terra, not tired old Earth.",
      "{name} was raised in a sea-cliff estate on Terra, taught by tutors and shaped by the motto carved over the door: Terra First. The {surname}s funded half the Transitionalist movement and expected their children to finish the job.",
      "{name} was the spare heir of the {surname} family, the one nobody expected to inherit anything but a title and good manners. Childhood was galas in Prime and summers on the family yacht in orbit.",
    ],
    turns: [
      "When Senator Mira Ngo lost the 2950 election, {short}'s father lost a fortune backing her. A year later he lost his life too. The family calls it an accident. {short} never has.",
      "Then the money stopped: accounts frozen, the yacht seized, and the family name dragged through the Terra Gazette over a bribery scandal {short} is sure was manufactured by Earth-loyalist rivals.",
      "At twenty, {short} found the letters. The {surname} fortune was built on Messer-era contracts, and some of those contracts had bodies attached. The family had spent a lifetime making sure nobody would ever read them.",
    ],
    nows: [
      "{short} left Prime with a family ship, an inheritance frozen by auditors, and one question: who profited when the {surname}s fell?",
      "Now {short} flies {their} own ship, takes work under a borrowed name, and is learning how the rest of the Empire lives. It's harder than the tutors said, and more honest.",
      "{short} walked away from the estate with one ship and a crate of letters, and still hasn't decided whether to burn the letters or publish them.",
    ],
    hooks: [
      { type: "secret", text: "Before the fall, {name}'s family was feeding a Terra Gazette journalist, {npc}, evidence of Earth-loyalist money moving through Stanton megacorps.", thread: "terra" },
      { type: "enemy", text: "A family rival, {npc}, bought the {surname} estate at auction and wants {short} out of the picture before the audit closes.", thread: "terra" },
      { type: "debt", text: "{short} owes {npc}, a Prime moneylender with Senate friends, for the loan that keeps the family ship flying.", thread: "terra" },
      { type: "lost", text: "{short}'s older sibling vanished from Prime the week everything fell apart, and has been living under the name {npc}. The last message came from somewhere in Stanton.", thread: "terra" },
    ],
  },
  pyro_outlaw: {
    label: "Pyro-Born Outlaw",
    emoji: "🔥",
    names: "pyro",
    home: "Pyro (Ruin Station, Patch City, or a freighter that never docked)",
    system: "Pyro",
    citizenship: "none",
    ties: { friendly: ["Rough & Ready"], hostile: ["Headhunters"] },
    openings: [
      "{name} was born on Ruin Station, under a dying flare star, in a system the Empire forgot. In Pyro you learn early that the law is whoever has the most guns this week.",
      "{name} grew up in Patch City, in a hab built from three different wrecks welded together. The first toy was a broken multitool; the first job was stripping scrap for whoever paid in food.",
      "{name} was born on a freighter that never docked anywhere long enough to call it home, running between Pyro's stations ahead of whatever debt was chasing the family that month.",
    ],
    turns: [
      "{short} was running cargo for Rough & Ready before {they} could legally fly in the UEE. Then the Headhunters came to collect a debt the crew didn't owe, and burned their ship to make the point. {short} was the only one who walked away.",
      "At fifteen, {short} watched {their} father lose the family ship in a card game at Checkmate, then lose his life arguing about it. The winner kept the ship. {short} kept the grudge.",
      "When the Frontier Fighters rolled into Pyro promising order, {short} believed them, right up until the day {they} saw what they did to a settlement that wouldn't pick a side.",
    ],
    nows: [
      "These days {short} flies between the gangs, the Citizens for Prosperity and the odd Stanton job, and has never forgotten a face.",
      "Now {short} runs jobs for whoever pays, and trusts nobody who smiles too much. In Pyro, that's a survival skill.",
      "{short} keeps moving: Pyro's lanes, Stanton's back doors, anywhere the past is a few jumps behind.",
    ],
    hooks: [
      { type: "enemy", text: "{npc}, a Headhunter enforcer with an old grudge against {short}, rose in the gang after Amelia Boyd's execution.", thread: "headhunters" },
      { type: "oath", text: "{name} swore to get an old friend, {npc}, out of a Headhunter debt cell.", thread: "headhunters" },
      { type: "debt", text: "{short} owes {npc}, a Rough & Ready quartermaster, for the ship {short} flies. Interest is paid in favours.", thread: "headhunters" },
      { type: "secret", text: "{short} knows where a Frontier Fighter cell buried its weapons cache. So does {npc}, and only one of them is still loyal to the cause.", thread: "frontier" },
      { type: "lost", text: "{short}'s little brother, who goes by {npc} these days, joined a Pyro gang last year, and {short} still doesn't know which one.", thread: "headhunters" },
    ],
  },
  navy_veteran: {
    label: "UEE Navy Veteran",
    emoji: "🎖️",
    names: "common",
    home: "Wherever the Navy sent them (last posting: the western front)",
    system: "Vega",
    citizenship: "citizen",
    ties: { friendly: ["UEE Navy", "Civilian Defense Force"], hostile: ["Vanduul"] },
    openings: [
      "{name} enlisted at eighteen to earn citizenship, and earned it at Vega in 2945, the day the Vanduul fell on Vega II and the sky burned.",
      "{name} grew up on a Navy base in Kilian, the child of a carrier mechanic, and could name every ship in the fleet before learning to read.",
      "{name} joined the UEE Navy to get off a farming world in Ellis and see the 'Verse. The Navy showed {them} the 'Verse: mostly the parts on fire.",
    ],
    turns: [
      "For three days straight {short} flew escort for evacuation transports. Not all of them made it out. Some nights the comms chatter still plays in {their} head.",
      "On a border patrol near Tiber, {short}'s wing found a Vanduul wreck that wasn't in any report. Command classified it within the hour and transferred everyone who had seen it.",
      "{short} was decorated for a rescue that went wrong in ways the citation leaves out. Two names didn't make it into the report, and {short} has never stopped saying them.",
    ],
    nows: [
      "Now {short} has a medal, a citizenship chit and no patience for desk work. CDF call-ups, escort contracts, anything that keeps {their} hands on a stick.",
      "Discharged with honours and a pension that barely covers fuel, {short} flies private now, and still salutes the carriers when they pass.",
      "{short} left the Navy quietly, but the Navy never quite left: the habits, the nightmares, and the friends still in uniform who call when they need a favour off the books.",
    ],
    hooks: [
      { type: "lost", text: "{name}'s wingmate, {npc}, was listed MIA on the front. Last month a transmission arrived on a dead Navy channel, signed with that callsign.", thread: "vanduul" },
      { type: "secret", text: "{name} saw something the Navy redacted: a Vanduul ship that didn't fire, as if it were waiting. Officer {npc} said to forget it.", thread: "vanduul" },
      { type: "enemy", text: "{npc}, a former commanding officer, signed the report that buried the squadron's mistakes, and is now a rising name in Navy intelligence.", thread: "vanduul" },
      { type: "oath", text: "{short} promised a dying crewmate to look after their kid, {npc}, who has since run off to Nyx.", thread: "vanduul_nyx" },
    ],
  },
  tevarin: {
    label: "Tevarin Descendant",
    emoji: "🌀",
    names: "tevarin",
    home: "The Tevarin diaspora (ancestral home: Elysium IV, Kaleeth)",
    system: "Elysium",
    citizenship: "civilian",
    ties: { friendly: ["Tevarin diaspora"], hostile: ["XenoThreat"] },
    openings: [
      "{name} carries a Tevarin name in a human empire. {Their} people lost two wars, and their homeworld Kaleeth with them. Humans call it Elysium IV now.",
      "{name} was raised in a Tevarin enclave on the edge of a human city, where the old songs were sung quietly and the old blades were kept wrapped in cloth.",
      "{name} is half Tevarin by blood and wholly Tevarin by choice, raised by a grandmother on the honour code and the stories of the lost fleet.",
    ],
    turns: [
      "{short}'s grandmother told the story of the last fleet at Elysium, which flew into the planet's shield rather than surrender. To humans it's a footnote. To the Tevarin it's a vow.",
      "When {short} was a teenager, a human gang torched the enclave's shrine. The UEE called it vandalism. The elders called it a test of patience, and {short} failed it, loudly.",
      "{short} flew for an Esperia test team, rebuilding old Tevarin warships for human collectors, until it became clear the job was selling {their} people's history piece by piece.",
    ],
    nows: [
      "{short} keeps the old code, which says a debt of honour outlives the one who made it. Then word came that a war-relic, the {relic}, had turned up in a collector's hands.",
      "Now {short} takes work across the Empire, with a Tevarin blade at {their} hip and a list of relics that should be home.",
      "These days {short} walks between two peoples, trusted fully by neither, and keeps the code anyway, because someone has to.",
    ],
    hooks: [
      { type: "oath", text: "The {relic}, a Tevarin war-relic, has surfaced in the hands of {npc}, a dealer who sells to the highest bidder.", thread: "tevarin" },
      { type: "enemy", text: "XenoThreat survivors have marked {name} as a target. Their cell leader, {npc}, is still out there.", thread: "xenothreat" },
      { type: "lost", text: "{short}'s cousin, {npc}, left the enclave to join a Tevarin separatist group and stopped answering messages.", thread: "tevarin" },
      { type: "debt", text: "{short} owes a debt of honour to {npc}, a human who once saved {their} life. Debts of honour must be paid.", thread: "tevarin" },
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
    openings: [
      "{name} was born inside an asteroid. Levski, in the Glaciem Ring of Nyx, was founded by people fleeing the Messer dictatorship who swore never to kneel to an Imperator again.",
      "{name} grew up in Levski's lower tunnels, where the air tastes of recycled metal and everyone votes on everything, including whose turn it is to fix the recyclers.",
      "{name}'s parents were UEE deserters who found sanctuary in Levski. Childhood was Alliance assemblies, ice-mining shifts, and knowing the Empire would arrest the whole family on sight.",
    ],
    turns: [
      "{short} grew up believing you share what you have. Then the Molina Mold came in through the failing Gyson filters, and {short} watched neighbours cough themselves to death while the Assembly argued.",
      "At seventeen, {short} joined a Glaciem Ring patrol and saw what the belt's outlaws do to miners who don't pay. The Assembly voted to negotiate. {short} voted with a rifle.",
      "When a UEE agent was caught inside Levski, {short} was the one who found them, and the one who argued against what the Assembly decided to do with them. {short} lost the vote. The agent lost more.",
    ],
    nows: [
      "Now {short} works the routes in and out of Nyx: still loyal, but no longer sure the Alliance's ideals can survive the Mold, the UEE's cold shoulder and the Vanduul gathering at the Virgil jump.",
      "These days {short} runs supplies for Levski and asks uncomfortable questions at Assembly meetings, which has made {them} both popular and watched.",
      "{short} left Levski to see the Empire everyone back home fears, and found it full of ordinary people. That's made coming home complicated.",
    ],
    hooks: [
      { type: "secret", text: "{name} found a shipping manifest showing the faulty Gyson filters were swapped in by a contractor, {npc}, a year before the outbreak.", thread: "molina" },
      { type: "lost", text: "{name}'s mentor, {npc}, went out to scout the Virgil jump point and hasn't checked in.", thread: "vanduul_nyx" },
      { type: "enemy", text: "{npc}, an Intersec Defense Solutions captain, has been squeezing Levski's traders for \"protection\" and has marked {short} as a troublemaker.", thread: "molina" },
      { type: "oath", text: "{short} swore to the Assembly to find out who has been selling Levski's patrol routes to the Shattered Blade. {npc} is the only lead.", thread: "shattered" },
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
    openings: [
      "{name} was a rising engineer at microTech in New Babbage, building the subsystems that make regen work.",
      "{name} grew up in New Babbage's glass towers, a scholarship kid in a city of executives, and graduated top of the class in imprint engineering.",
      "{name} was a microTech field technician: the one who flew out to fix regen stations on frozen outposts nobody else wanted to visit.",
    ],
    turns: [
      "When the regen failures began, {short} filed an internal report linking them to data from an ASD partner lab called Onyx. The report disappeared. So did {short}'s security clearance.",
      "{short} was on the team that tried to revive a patient whose imprint wouldn't load. The family was told it was a hardware fault. {short} had read the logs, and it wasn't.",
      "One night {short} found an unlisted data link between a microTech med-bed network and an ASD server. A supervisor said to forget it. The next morning the supervisor was gone.",
    ],
    nows: [
      "{short} freelances now, and knows more than is healthy about what happened inside ASD's Onyx facilities and about the missing Dr. Logan Jorrit.",
      "Now {short} fixes ships for cash and keeps a backup of everything on a drive that never leaves {their} sight.",
      "These days {short} works outside the corporate world and sleeps lightly, because people who ask questions about regen tend to have accidents.",
    ],
    hooks: [
      { type: "secret", text: "{name}'s buried report contains an Onyx facility code that the Hockrow Agency investigator {npc} would kill to see.", thread: "asd" },
      { type: "enemy", text: "An ASD fixer, {npc}, has been told to make sure {name} never testifies.", thread: "asd" },
      { type: "lost", text: "{short}'s old lab partner, {npc}, went to work for ASD and hasn't been seen since the Onyx sites were abandoned.", thread: "asd" },
      { type: "debt", text: "{short} owes {npc}, a data broker at GrimHEX, for a new identity that isn't paid off yet.", thread: "asd" },
    ],
  },
  banu_trader: {
    label: "Raised Among Banu Traders",
    emoji: "🪙",
    names: "trader",
    home: "A Banu trading Souli (the Protectorate)",
    system: "Banu space",
    citizenship: "civilian",
    ties: { friendly: ["Banu traders", "Wikelo"], hostile: ["XenoThreat"] },
    openings: [
      "{name} was raised by human traders who settled in a Banu Souli, where everything has a price and everyone is a potential partner.",
      "{name} was born on a Banu trade barge, the only human child among a crew of merchants who treated {them} as a lucky charm and a junior partner at once.",
      "{name}'s family ran the human end of a Banu trade route for three generations, ferrying goods nobody could quite name between the Protectorate and UEE space.",
    ],
    turns: [
      "{short} could haggle in three languages before learning to fly, and learned early that the Banu see contracts and ownership very differently from humans.",
      "A deal went sour when a UEE customs officer seized a cargo the Banu considered sacred. {short}'s family took the blame, and lost the route and their good name with it.",
      "{short} once traded a broken ship for a Banu artefact that turned out to be worth more than a station. To this day, nobody knows who it really belongs to.",
    ],
    nows: [
      "Back in human space, {short} trades in the gaps: exotic goods, odd favours, and barter with Banu merchants like Wikelo, who always wants one more strange thing.",
      "Now {short} works the borders of three kinds of law: human, Banu and Pyro's. {They're} good at it, and that worries people.",
      "These days {short} runs a small trading ship and a large network of people who owe favours.",
    ],
    hooks: [
      { type: "debt", text: "{name} owes a Banu Souli a \"favour of equal weight\", and a Banu envoy, {npc}, has come to collect.", thread: "banu" },
      { type: "secret", text: "{name} once brokered a sale that ended up arming the Frontier Fighters. Only {npc} knows.", thread: "frontier" },
      { type: "enemy", text: "{npc}, a UEE customs officer, has made it a personal mission to put {short} out of business.", thread: "banu" },
      { type: "lost", text: "{short}'s trading partner, {npc}, vanished with half their shared cargo and a Banu artefact that wasn't theirs to take.", thread: "banu" },
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

// ── Crew roles: everyone on a mission gets a different one ───────────────────
// Real jobs aboard a Star Citizen crew (engineering arrived in Alpha 4.5).
export const CREW_ROLES = {
  pilot: { label: "Pilot", emoji: "🛩️", job: "Flies the ship and calls the approach. Gets everyone in and out alive." },
  engineer: { label: "Engineer", emoji: "🔧", job: "Runs the ship's power and repairs: reroutes power, fights fires, keeps components alive under fire." },
  xo: { label: "XO", emoji: "🎖️", job: "Runs the op: accepts and shares the contract, makes the tactical calls, keeps comms with the DM's contacts." },
  gunner: { label: "Gunner", emoji: "🎯", job: "Mans the turrets, or is the second gun in the fight. Nothing gets close without permission." },
  medic: { label: "Medic", emoji: "🩺", job: "Keeps everyone breathing: med pens, revives, and the med bed if the ship has one. Stays close to the guns." },
  loadmaster: { label: "Loadmaster", emoji: "📦", job: "Handles cargo, the tractor beam and the freight elevators. Knows what's aboard and where." },
  scout: { label: "Scout", emoji: "🔭", job: "Goes ahead: scans, watches from cover, and spots trouble before it spots the crew." },
  boarding: { label: "Boarding Lead", emoji: "🚪", job: "First through the door on foot. Leads the crew in every FPS push." },
  salvage: { label: "Salvage Specialist", emoji: "♻️", job: "Strips what matters from wrecks and sites, and knows what's worth taking." },
  quartermaster: { label: "Quartermaster", emoji: "🎒", job: "Gear, ammo, food and water for the crew, and the deals to get them. Nobody runs dry on your watch." },
};

// Which roles suit each origin's background.
export const ORIGIN_ROLES = {
  hurston_worker: ["engineer", "loadmaster", "quartermaster"],
  terran_noble: ["xo", "pilot", "quartermaster"],
  pyro_outlaw: ["pilot", "gunner", "boarding", "scout"],
  navy_veteran: ["xo", "pilot", "gunner"],
  tevarin: ["pilot", "scout", "boarding"],
  levski_born: ["engineer", "medic", "loadmaster"],
  microtech_engineer: ["engineer", "medic", "salvage"],
  banu_trader: ["quartermaster", "loadmaster", "xo"],
};

// Words in a character's name, callsign, idea or backstory that point at a role.
export const ROLE_WORDS = {
  pilot: /\b(pilot|fly|flew|flying|flight|wing|ace)\b/i,
  engineer: /\b(engineer\w*|mechanic|fix(ed|es|ing)?|repair\w*|tinker\w*|wrench)\b/i,
  xo: /\b(xo|officer|command\w*|captain|lead(er)?|navy)\b/i,
  gunner: /\b(gun\w*|turret|shoot\w*|killshot|trigger)\b/i,
  medic: /\b(medic\w*|doctor|nurse|heal\w*|med ?bed)\b/i,
  loadmaster: /\b(cargo|haul\w*|freight|trader?|trading)\b/i,
  scout: /\b(scout\w*|sniper|hunt(er|ing)?|bounty|track\w*)\b/i,
  boarding: /\b(marine|soldier|merc(enary)?|breach\w*|board\w*)\b/i,
  salvage: /\b(salvag\w*|scrap\w*|wreck\w*)\b/i,
  quartermaster: /\b(supply|supplies|quartermaster|smuggl\w*|deal\w*|barter)\b/i,
};

// Old careers (characters made before roles) still count as a hint.
export const CAREER_TO_ROLE = { pilot: "pilot", hauler: "loadmaster", miner: "engineer", bounty: "scout", marine: "boarding", medic: "medic", salvager: "salvage", explorer: "scout", smuggler: "quartermaster" };

// The role each mission type most needs filled.
export const MISSION_NEEDS = {
  heist: ["boarding", "engineer", "scout"],
  bounty: ["pilot", "gunner", "scout"],
  salvage: ["salvage", "engineer", "loadmaster"],
  rescue: ["medic", "pilot", "boarding"],
  smuggle: ["pilot", "loadmaster", "xo"],
  defense: ["gunner", "pilot", "engineer"],
};

// A meeting point for the crew: a real place that stands in for the story's rendezvous.
export const RENDEZVOUS = {
  Stanton: ["GrimHEX (Yela)", "Area18", "Lorville", "New Babbage", "Orison", "an ArcCorp Lagrange station"],
  Pyro: ["Ruin Station", "Checkmate Station", "Orbituary", "Patch City"],
  Nyx: ["Levski"],
};

// ── Forced stops on the way (rolled per mission) ─────────────────────────────
// Kinds of places that exist in each system; players pick a matching one on the starmap.
export const STOP_PLACES = {
  Stanton: [
    { place: "an abandoned settlement on Daymar", kind: "hostile" },
    { place: "a derelict outpost on Wala", kind: "hostile" },
    { place: "a cave on Aberdeen", kind: "hostile" },
    { place: "a mining outpost on Arial", kind: "camp" },
    { place: "a Rest & Relax stop at a Lagrange point", kind: "resupply" },
    { place: "an Onyx Facility on Cellin", kind: "hostile" },
    { place: "a wreck in the Yela asteroid belt", kind: "wreck" },
  ],
  Pyro: [
    { place: "a derelict outpost on Bloom", kind: "hostile" },
    { place: "a Citizens for Prosperity holdout on Monox", kind: "hostile" },
    { place: "a gang-held outpost on Pyro IV", kind: "hostile" },
    { place: "an abandoned settlement on Terminus", kind: "camp" },
    { place: "a cave system on Bloom", kind: "hostile" },
    { place: "Checkmate Station or Orbituary", kind: "resupply" },
    { place: "a wreck field around Pyro V's moons", kind: "wreck" },
  ],
  Nyx: [
    { place: "an abandoned station in the Keeger Belt", kind: "hostile" },
    { place: "a dead mining platform in the Glaciem Ring", kind: "camp" },
    { place: "a smuggler drop in the Keeger Belt", kind: "hostile" },
    { place: "Levski's outer docks", kind: "resupply" },
  ],
};

export const STOP_REASONS = {
  any: [
    "the quantum drive is running hot after the last jump and needs to cool",
    "a solar flare is sweeping the lanes; flying through it fries electronics",
    "someone has been on your tail since you left, and you need to lose them on the ground",
    "the crew has been running on stims and empty stomachs; people are making mistakes",
    "comms picked up a signal from there that matches something from your past",
    "the fuel numbers don't add up; someone siphoned your tanks at the last stop",
  ],
  ship: ["{who}'s ship is carrying damage and won't take another jump without a patch"],
  injury: ["{who} is hurt worse than they're letting on and needs a few hours flat on their back"],
};

export const STOP_ACTIONS = {
  hostile: [
    "Clear it on foot. Someone's squatting there, and they won't share.",
    "Clear it, then hold it for the night: set a watch rotation.",
  ],
  camp: [
    "Set up camp: secure the doors and sleep in shifts.",
    "Make camp and scavenge whatever's useful from the lockers.",
  ],
  resupply: [
    "Resupply: food, water, ammo and med pens. Someone here is watching you, though.",
    "Refuel and repair, and keep it quick. Word travels fast here.",
  ],
  wreck: [
    "Search the wreck for parts, and for whoever flew it.",
    "Strip the wreck for what you need. The crew's logs might still be readable.",
  ],
};

// Survival beats the game actually has (hunger, thirst, rest) to make a stop feel lived-in.
export const STOP_NEEDS = [
  "Everyone eats and drinks something before moving on (hunger and thirst are real in game).",
  "Someone stands watch while the others rest.",
  "Patch up any wounds with med pens before you leave.",
  "Check the ship over: fuel, ammo, hull.",
];
