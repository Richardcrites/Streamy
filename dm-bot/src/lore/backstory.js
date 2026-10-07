// Building blocks for origin stories. A story is assembled from many small, independent pieces (where
// you were born, who raised you, what you were good at, what broke, your first ship, what you carry,
// what you want), told through one of several narrative frames. Pieces carry tags: the player's
// picked traits (and words in their description) pull matching pieces forward, and pieces already used
// on the server are pushed back, so no two characters read alike.
//
// Template rules (pronoun-safe): {name} full name, {short} short name, {they} {them} {their} (and
// capitalised {They} {Their}). After {they}, only use past-tense verbs other than was/were, or modal
// verbs (could, would, never…). Write "{short} was" / "{short} is", never "{they} was" / "{they} is".

// ── Traits: what the player says defines them (pick up to 3) ─────────────────
export const TRAITS = {
  lost_family: { label: "Lost family", emoji: "🕯️", words: /\b(orphan|lost (my|his|her|their)|dead (mother|father|sister|brother)|widow)/i },
  ex_military: { label: "Ex-military", emoji: "🎖️", words: /\b(navy|marine|soldier|military|veteran|army|cdf|squadron)\b/i },
  criminal: { label: "Criminal past", emoji: "🗝️", words: /\b(thief|smuggl|criminal|pirate|gang|crimestat|prison|klescher|outlaw|con artist)/i },
  gambler: { label: "Gambler", emoji: "🎲", words: /\b(gambl|cards|bet|poker|casino|dice)/i },
  faith: { label: "Faith", emoji: "🙏", words: /\b(faith|church|god|pray|priest|believer|religio)/i },
  tinkerer: { label: "Tinkerer / inventor", emoji: "🔧", words: /\b(engineer|invent|mechanic|tinker|build|fix|repair|scientist)/i },
  runaway: { label: "Runaway", emoji: "🏃", words: /\b(ran away|runaway|fled|escape|on the run)/i },
  survivor: { label: "Sole survivor", emoji: "🔥", words: /\b(surviv|only one (left|who)|massacre|attack)/i },
  joker: { label: "Joker / entertainer", emoji: "🎭", words: /\b(comed|comic|joke|jokes|funn(y|iest)|laugh|stand-?up|routine|booking|gig|clown|entertain|perform|actor|bard|heckl)/i },
  haunted: { label: "Haunted", emoji: "👻", words: /\b(haunt|nightmare|ghost|guilt|regret|trauma)/i },
  fallen_rich: { label: "Lost a fortune", emoji: "💸", words: /\b(rich|fortune|wealthy|noble|heir|aristocrat|bankrupt|lost everything)/i },
  debt: { label: "Owes the wrong people", emoji: "🧾", words: /\b(debt|owe|loan|collector)/i },
  medic: { label: "Healer", emoji: "🩺", words: /\b(medic|doctor|nurse|heal|surgeon|paramedic)/i },
  explorer: { label: "Explorer at heart", emoji: "🧭", words: /\b(explor|pathfind|chart|map|scout|wander)/i },
  loner: { label: "Loner", emoji: "🌑", words: /\b(loner|alone|solitary|quiet|hermit)/i },
  loyal: { label: "Fiercely loyal", emoji: "🛡️", words: /\b(loyal|protect|family first|bodyguard)/i },
  ambitious: { label: "Ambitious", emoji: "📈", words: /\b(ambitio|empire|power|rise|business|tycoon|corporat)/i },
  vengeance: { label: "Out for revenge", emoji: "🗡️", words: /\b(reveng|vengeance|grudge|payback|hunt(ing)? (down|for)|get even)/i },
  artist: { label: "Artist / musician", emoji: "🎨", words: /\b(artist|music|paint|poet|writer|guitar|song)/i },
  ace: { label: "Born to fly", emoji: "🛩️", words: /\b(pilot|racer|racing|fly|flying|flew|ace|dogfight)\b/i },
};

// Traits a player didn't pick can still come from their description.
export const traitsFromText = (text) => Object.keys(TRAITS).filter((k) => TRAITS[k].words.test(text || ""));

// ── Per-origin flavour: where you could be from, and what it was like ────────
export const ORIGIN_BITS = {
  hurston_worker: {
    places: ["the worker blocks under Teasa Spaceport", "a rented bunk in Lorville's Central Business District", "a mining camp on Arial", "a hab stack on the edge of the Lorville gates", "a Hurston refinery town on Magda"],
    details: ["where the air tastes of metal and the shift horn is the only clock that matters", "where the company store sells everything, including the debt to pay for it", "where everyone's wages come in Hurston scrip and leave just as fast", "where Hurston Security patrols are more common than streetlights"],
    hangouts: ["the noodle stalls of Lorville", "the bars around Teasa Spaceport", "the shift lockers on the munitions line"],
  },
  terran_noble: {
    places: ["a glass tower in Prime", "a sea-cliff estate on Terra", "a family yacht that hardly ever landed", "the Senate quarter of Prime", "a private school on Terra's southern coast"],
    details: ["where dinner conversation was about Senate seats and who owed whom", "where the help knew more family secrets than the family did", "where the motto over the door was 'Terra First'", "where every birthday was a political fundraiser"],
    hangouts: ["the private clubs of Prime", "the Terra Gazette's favourite bars", "the gala circuit"],
  },
  pyro_outlaw: {
    places: ["Ruin Station", "Patch City", "a freighter that never docked anywhere for long", "a Citizens for Prosperity homestead on Bloom", "the scrap yards on Monox"],
    details: ["where the law is whoever has the most guns this week", "where the star flares and everyone pretends not to be scared", "where the first lesson is never to trust a smile", "where food, fuel and friendship all cost something"],
    hangouts: ["the bars of Ruin Station", "Checkmate's card tables", "the docks at Patch City"],
  },
  navy_veteran: {
    places: ["a Navy family housing block on Earth", "a colony on the edge of Vega", "a training school on Kilian", "a farming world in the Ferron system", "a base town outside Navy Fleet Command"],
    details: ["where everyone either served or knew someone who didn't come back", "where the recruiters came every spring like the rain", "where the Vanduul were bedtime stories until they weren't", "where a uniform was the only way off-world"],
    hangouts: ["veterans' bars from Lorville to Levski", "the CDF recruitment offices", "every hangar with a Gladius in it"],
  },
  tevarin: {
    places: ["a Tevarin enclave in the diaspora", "a crowded hab on Elysium IV", "a human city where {they} grew up the only Tevarin on the street", "a Tevarin family ship that carried three generations", "a memorial settlement near Kaleeth"],
    details: ["where the old songs of the Warriors are still sung", "where elders still keep the Ishuvan Codex", "where humans stared and children asked questions", "where honour was taught before reading"],
    hangouts: ["Tevarin cultural halls", "quiet hangars at night", "the starmap, plotting routes to old Tevarin worlds"],
  },
  levski_born: {
    places: ["the tunnels of Levski", "a mining crew's bunkroom on Delamar", "the People's Alliance clinic in Levski", "a hab carved into Delamar's rock", "the cargo decks of a Nyx ore hauler"],
    details: ["where the Assembly votes on everything and agrees on nothing", "where the air filters hum all night and everyone listens for them to stop", "where the Empire is a rumour and the Vanduul are a threat", "where you share what you have or nobody eats"],
    hangouts: ["the Levski market", "the Assembly gallery", "the miners' bars on the Glaciem Ring"],
  },
  microtech_engineer: {
    places: ["New Babbage", "a research dome on microTech", "a snowed-in town outside New Babbage", "a microTech corporate housing tower", "an ASD-funded science school on Clio"],
    details: ["where the snow never stops and the labs never sleep", "where everyone signs a non-disclosure agreement before their first job", "where the city is beautiful and the rent is brutal", "where the smartest people in Stanton work for whoever pays most"],
    hangouts: ["New Babbage's engineering forums", "the labs after hours", "a corner booth at the Commons"],
  },
  banu_trader: {
    places: ["a Banu trading Souli", "a Banu market world in the Protectorate", "the hold of a Banu Merchantman", "a human-Banu trade post near the border", "a bazaar station where nothing has a fixed price"],
    details: ["where every bargain is a story and every story is a bargain", "where the only human kid on the station learned twelve ways to say 'deal'", "where a debt is sacred and a contract is a promise", "where strange goods came and went, and nobody asked where from"],
    hangouts: ["Wikelo's Emporium", "trade terminals across Stanton", "any market with a good haggle"],
  },
};

// ── Universal pieces. tags = traits that pull them forward. ──────────────────
export const FAMILY = [
  { text: "{Their} mother flew medevac for the Stanton CDF and came home smelling of med-gel and burnt circuits.", tags: ["medic", "loyal"] },
  { text: "{Their} father ran a repair shop out of a cargo container and taught {short} to read a wiring diagram before a book.", tags: ["tinkerer"] },
  { text: "{Their} grandmother raised {them} on stories of the Messer years and a rule: never trust a man in a clean uniform.", tags: ["faith", "loyal"] },
  { text: "{Their} older sister joined the Navy at seventeen and sent home one message a year, always from a different system.", tags: ["ex_military", "lost_family"] },
  { text: "Nobody ever told {short} who {their} father was, and {short} stopped asking at eight.", tags: ["loner", "runaway"] },
  { text: "{Their} parents ran a small-time smuggling operation and called it 'logistics' in front of the kids.", tags: ["criminal"] },
  { text: "{Their} uncle was a professional gambler who lost everything twice and won it back once.", tags: ["gambler"] },
  { text: "{Their} family was big, loud and broke: seven kids, two rooms, one working air recycler.", tags: ["loyal"] },
  { text: "{Their} mother was a musician who played the bars for tips and never let anyone see her cry.", tags: ["artist", "joker"] },
  { text: "{Their} father was a preacher of the Church of the Inner Light who believed every stranger deserved a meal.", tags: ["faith"] },
  { text: "{short} was raised by a crew, not a family: six spacers on a Freelancer who took turns being the grown-up.", tags: ["explorer", "ace"] },
  { text: "{Their} twin was the clever one, everybody said. {short} spent {their} childhood trying to prove them wrong.", tags: ["ambitious"] },
  { text: "{Their} parents were both surgeons, both brilliant, and both too busy to notice {short} growing up.", tags: ["medic", "loner"] },
  { text: "{Their} foster father was a retired bounty hunter with a bad knee and a long memory.", tags: ["vengeance", "ex_military"] },
  { text: "{Their} family had money once. By the time {short} was old enough to notice, all that was left was the manners.", tags: ["fallen_rich"] },
  { text: "{Their} father owed money to everyone in the system, and {short} learned to answer the door with a lie ready.", tags: ["debt", "criminal"] },
  { text: "{Their} mother was a stand-up comic on the station circuit, and the first sound {short} remembered was a crowd laughing.", tags: ["joker", "artist"] },
  { text: "{Their} grandfather built ships for Drake Interplanetary and took {short} to every test flight he could sneak {them} into.", tags: ["ace", "tinkerer"] },
  { text: "{short} lost both parents to a hull breach at nine, and was raised after that by whoever on the station had room.", tags: ["lost_family", "survivor"] },
  { text: "{Their} older brother was the family's golden child, until the day he walked out and never came back.", tags: ["lost_family", "haunted"] },
  { text: "{Their} mother charted jump points for a living and was gone for months at a time, always with a story when she came back.", tags: ["explorer"] },
  { text: "{Their} family ran a diner at a rest stop, and {short} grew up feeding every kind of spacer the 'Verse makes.", tags: ["loyal", "joker"] },
];

export const CHILDHOOD = [
  { text: "As a kid {short} took apart every drone {they} could get {their} hands on, and put most of them back together.", tags: ["tinkerer"] },
  { text: "At twelve {short} won {their} first card game against a grown spacer, and lost the winnings an hour later.", tags: ["gambler"] },
  { text: "{short} learned to fly in a simulator pod at a station arcade, and beat every high score on it by fifteen.", tags: ["ace"] },
  { text: "{short} was the kid who did impressions of the station administrator, and got in trouble for every one of them.", tags: ["joker"] },
  { text: "{short} spent {their} childhood drawing ships on every surface that would hold ink.", tags: ["artist", "ace"] },
  { text: "{short} patched up stray animals, then neighbours, then anyone who couldn't afford a clinic.", tags: ["medic"] },
  { text: "{short} ran away from home three times before fourteen. The fourth time, {they} didn't come back.", tags: ["runaway"] },
  { text: "{short} learned to pick locks before {they} learned long division, and never saw a reason to stop.", tags: ["criminal"] },
  { text: "{short} memorised every starmap {they} could find and planned trips to systems {they} would never afford to see.", tags: ["explorer"] },
  { text: "{short} said very little as a child, and listened to everything.", tags: ["loner"] },
  { text: "{short} was always the one who stood between the bullies and the smaller kids, and had the bruises to show for it.", tags: ["loyal"] },
  { text: "{short} sold stolen snacks at school, then hired other kids to sell them, and called it a business.", tags: ["ambitious", "criminal"] },
  { text: "{short} sang in the station's chapel choir and knew every hymn by heart, even after {they} stopped believing them.", tags: ["faith", "artist"] },
  { text: "{short} trained with an old Marine's practice rifle in the cargo bay until {they} could hit a ration tin at forty metres.", tags: ["ex_military", "vengeance"] },
  { text: "{short} kept a journal of every ship that docked, every name, every face, and still has it.", tags: ["haunted", "explorer"] },
  { text: "{short} was the fastest runner in the block and used that skill mostly to escape consequences.", tags: ["runaway", "joker"] },
];

export const TURNS = [
  { text: "Then the station {short} called home was hit by raiders, and {short} spent two days hiding in a ventilation duct listening to it happen.", tags: ["survivor", "haunted"] },
  { text: "Everything changed the night {short} bet {their} family's ship in a card game, and lost.", tags: ["gambler", "debt"] },
  { text: "Then came the joke that ended a career: one routine about the Imperator, in front of the wrong audience, and every booking in Stanton dried up overnight.", tags: ["joker"] },
  { text: "At nineteen {short} took a job that paid too well, and found out why when the cargo started knocking from inside the crate.", tags: ["criminal", "haunted"] },
  { text: "{Their} best friend died on a job {short} talked them into. {short} has never forgiven the people who set it up, or forgiven {short}.", tags: ["vengeance", "haunted"] },
  { text: "The family business went under in one bad quarter, and the creditors took everything except the debt.", tags: ["fallen_rich", "debt"] },
  { text: "{short} enlisted to get away from home and came back four years later with a medal and no interest in talking about it.", tags: ["ex_military", "haunted"] },
  { text: "A medical ship came through when plague hit the settlement, and {short} worked beside its crew for six weeks without sleep. When it left, {short} left with it.", tags: ["medic", "runaway"] },
  { text: "{short} found a derelict at the edge of a belt, logged it, and woke up to find someone had already reported {them} for salvage theft.", tags: ["explorer", "criminal"] },
  { text: "{short} built an engine modification that doubled a racer's speed, and the racing league banned it, the racer and {short} in one afternoon.", tags: ["tinkerer", "ace"] },
  { text: "The day {their} parent died, a stranger came to the funeral, paid every debt the family had, and left without a name.", tags: ["lost_family", "debt"] },
  { text: "{short} was arrested for something {they} didn't do, and spent eight months mining at Klescher learning things {they} later did.", tags: ["criminal"] },
  { text: "{short} won a racing cup at the Murray Cup qualifiers, and lost the sponsor the same week for punching a judge.", tags: ["ace", "vengeance"] },
  { text: "Someone {short} trusted sold {their} location to a bounty hunter. {short} got away. The trust didn't.", tags: ["loner", "runaway"] },
  { text: "{short} played one song at a dockside bar and a talent scout signed {them} on the spot, right before the scout's ship went missing with the contract.", tags: ["artist", "joker"] },
  { text: "A fire took the family home. {short} went back in for one thing, and came out with it and a burn scar.", tags: ["survivor", "loyal"] },
  { text: "{short} lost {their} faith on a hospital ship, holding the hand of a stranger who died anyway. Or maybe that's where {they} found it. {short} still isn't sure.", tags: ["faith", "medic"] },
  { text: "{short} spent everything on a business that was going to change everything. It changed one thing: the size of {their} debt.", tags: ["ambitious", "debt"] },
  { text: "A Vanduul raid took {short}'s home colony off the map. Officially, there were no survivors. Officially.", tags: ["survivor", "lost_family", "ex_military"] },
  { text: "{short} saw something on a corporate survey job {short} wasn't meant to see, and the company's lawyers have been calling ever since.", tags: ["tinkerer", "explorer"] },
];

export const SHIPS = ["a battered Aurora MR", "a secondhand Mustang Alpha", "a Drake Cutlass Black with a cracked canopy", "a C1 Spirit with someone else's name still on the hull", "an Avenger Titan held together with tape and prayers",
  "an Origin 100i that was far too nice for {their} budget", "a Consolidated Outland Nomad", "an Anvil Pisces that used to be a ship's tender", "a Drake Buccaneer with three previous owners and a bounty on one of them",
  "a MISC Freelancer older than {short}", "a Drake Vulture", "a MISC Prospector that smelled of quantainium dust", "an Aopoa Nox", "a Drake Herald with half its data cores missing", "an Esperia Talon nobody could explain"];
export const SHIP_HOW = [
  { text: "won in a card game at GrimHEX", tags: ["gambler"] }, { text: "bought with three years of wages", tags: ["ambitious"] },
  { text: "inherited from someone who didn't need it any more", tags: ["lost_family"] }, { text: "pulled out of a scrapyard and rebuilt bolt by bolt", tags: ["tinkerer"] },
  { text: "'borrowed' and never returned", tags: ["criminal", "runaway"] }, { text: "paid for with a loan {short} is still paying off", tags: ["debt"] },
  { text: "given as a thank-you by a captain whose life {short} saved", tags: ["medic", "loyal"] }, { text: "bought at a Navy surplus auction", tags: ["ex_military"] },
  { text: "found drifting with nobody aboard and no logs", tags: ["explorer", "haunted"] }, { text: "traded for a song, almost literally", tags: ["artist", "joker"] },
];

export const SKILLS = [
  { text: "someone with the steadiest hands in any medbay", tags: ["medic"] }, { text: "a pilot who can thread an asteroid field half asleep", tags: ["ace"] },
  { text: "able to fix anything with power running through it", tags: ["tinkerer"] }, { text: "the person who makes a crew laugh when it's about to fall apart", tags: ["joker"] },
  { text: "a crack shot with a rifle", tags: ["ex_military", "vengeance"] }, { text: "a natural at reading people across a card table", tags: ["gambler"] },
  { text: "good at getting into places", tags: ["criminal"] }, { text: "a born navigator, never lost and rarely late", tags: ["explorer"] },
  { text: "the one who remembers every name and keeps every promise", tags: ["loyal"] }, { text: "a negotiator who can talk a pirate out of a ransom", tags: ["ambitious"] },
  { text: "calm in a crisis, eerily so", tags: ["survivor", "haunted"] }, { text: "someone who can make anything sound like music, even a coolant pump", tags: ["artist"] },
  { text: "the quietest person on any ship, and the one who notices everything", tags: ["loner"] }, { text: "the person who always has a plan B", tags: ["runaway"] },
];
export const FLAWS = [
  { text: "a temper that runs hotter than a quantum drive", tags: ["vengeance"] }, { text: "a habit of betting money {short} doesn't have", tags: ["gambler", "debt"] },
  { text: "a joke for every moment, especially the wrong ones", tags: ["joker"] }, { text: "nightmares {short} doesn't talk about", tags: ["haunted", "survivor"] },
  { text: "a total inability to walk away from someone in trouble", tags: ["medic", "loyal"] }, { text: "a deep, lasting distrust of anyone in a uniform", tags: ["criminal", "runaway"] },
  { text: "pride, mostly", tags: ["fallen_rich", "ambitious"] }, { text: "a tendency to vanish when things get close", tags: ["loner", "runaway"] },
  { text: "a stubborn streak a Vanduul would admire", tags: ["ex_military", "loyal"] }, { text: "a weakness for anything shiny, expensive and someone else's", tags: ["criminal"] },
  { text: "the conviction that every engine can go faster", tags: ["ace", "tinkerer"] }, { text: "faith that sometimes looks a lot like recklessness", tags: ["faith"] },
  { text: "an itch to see what's past the next jump point, whatever's on fire behind", tags: ["explorer"] },
];

export const MEMENTOS = [
  { text: "a cracked helmet visor from the day everything went wrong", tags: ["survivor", "haunted"] }, { text: "a deck of cards with the ace of spades missing", tags: ["gambler"] },
  { text: "a coin from Old Earth that {short} flips before every big decision", tags: ["gambler", "faith"] }, { text: "dog tags that aren't {their} own", tags: ["ex_military", "lost_family"] },
  { text: "a multitool older than most of the ships {short} has flown", tags: ["tinkerer"] }, { text: "a recording of {their} mother's voice that {short} has never played", tags: ["lost_family", "haunted"] },
  { text: "a set of lockpicks sewn into a jacket lining", tags: ["criminal"] }, { text: "a battered songbook full of lyrics nobody else has heard", tags: ["artist"] },
  { text: "a ticket stub from {their} last show", tags: ["joker", "artist"] }, { text: "a hand-drawn starmap of a system that isn't on any official chart", tags: ["explorer"] },
  { text: "a med pen that's been empty for years", tags: ["medic", "haunted"] }, { text: "a Hurston scrip token worth nothing to anyone else", tags: ["debt"] },
  { text: "a signet ring with the family crest filed off", tags: ["fallen_rich"] }, { text: "a scrap of hull plating with a name scratched into it", tags: ["survivor", "vengeance"] },
  { text: "a prayer card from a church on a world that doesn't exist any more", tags: ["faith"] }, { text: "a racing trophy with a dent the exact shape of a judge's face", tags: ["ace", "vengeance"] },
];

export const WANTS = [
  { text: "one big score, enough to never owe anyone again", tags: ["debt", "gambler"] }, { text: "to find out who sold {their} family out", tags: ["lost_family", "vengeance"] },
  { text: "a ship of {their} own, fully paid for, with a crew {they} would die for", tags: ["ace", "loyal"] }, { text: "to make one room full of strangers laugh again", tags: ["joker"] },
  { text: "to see every system on the starmap, and a few that aren't", tags: ["explorer"] }, { text: "to buy back what {their} family lost", tags: ["fallen_rich", "ambitious"] },
  { text: "to put a name and a face to the person who ruined {their} life", tags: ["vengeance"] }, { text: "to stay ahead of whoever's still looking for {them}", tags: ["runaway", "criminal"] },
  { text: "to build something that outlasts {them}", tags: ["tinkerer", "ambitious"] }, { text: "a quiet place, and the right to be left alone in it", tags: ["loner"] },
  { text: "to keep this crew alive, whatever it costs", tags: ["loyal", "medic"] }, { text: "to stop dreaming about that night", tags: ["haunted", "survivor"] },
  { text: "proof that what {short} believes is true", tags: ["faith"] }, { text: "to write the song that finally says it right", tags: ["artist"] },
  { text: "to be the kind of person {their} younger self would have looked up to", tags: [] },
];

export const SECRETS = [
  { text: "{short} has never told anyone where {they} went the year {they} disappeared", tags: [] },
  { text: "{they} still answer to a name nobody on this crew has heard", tags: [] },
  { text: "{they} left someone behind, and they're still out there", tags: ["runaway", "haunted"] }, { text: "the debt isn't the worst thing {they} owe", tags: ["debt"] },
  { text: "{they} could have stopped what happened, and didn't", tags: ["survivor", "haunted"] }, { text: "the medal was for something {they} would rather forget", tags: ["ex_military"] },
  { text: "{their} real name isn't the one on the ship registry", tags: ["criminal", "runaway"] }, { text: "the joke that ended the career wasn't a joke. Someone paid {them} to say it", tags: ["joker"] },
  { text: "{short} still sends money home, anonymously, every month", tags: ["loyal", "lost_family"] }, { text: "{they} kept a copy of the evidence", tags: ["tinkerer", "criminal"] },
  { text: "{they} never actually lost that card game. {They} threw it", tags: ["gambler"] }, { text: "{they} went to the place on that starmap, once", tags: ["explorer"] },
];

// ── Narrative frames: how the pieces are told ────────────────────────────────
export const RUMOUR_INTROS = [
  "Ask around {hangout} about {short} and you'll get three different stories. Here's the one that holds up.",
  "Everyone in {hangout} has an opinion about {short}. Most of them are wrong.",
  "If you've spent any time in {hangout}, you've heard of {short}. You probably haven't heard this.",
];
export const OBJECT_INTROS = [
  "{short} carries three things everywhere, and each one is a chapter.",
  "You can read {short}'s whole life in the things {they} won't sell.",
];
export const NOW_LINES = [
  "These days {short} takes whatever work keeps the engines warm, and wants {want}.",
  "Now {short} flies for whoever pays, and what {short} really wants is {want}.",
  "What {short} wants now is simple to say and hard to get: {want}.",
  "Right now {short} is in the 'Verse with one goal: {want}.",
];
export const RECORD_NOTES = ["no outstanding warrants (that the system knows about)", "two minor flight violations, both disputed", "flagged for 'further review', reason not given", "clean, suspiciously so", "one sealed entry"];
