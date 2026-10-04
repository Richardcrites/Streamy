// Real points of interest in the Pyro system (Alpha 4.x), so missions name places you can fly to.
// Sources: Star Citizen Wiki (starcitizen.tools), the official starmap API (api.star-citizen.wiki),
// RSI Galactapedia. `faction: null` means the controlling faction wasn't confirmed.
//
// kind decides what a stop there looks like:
//   hostile  – gang-held or derelict: you clear it (or sneak through)
//   friendly – Citizens for Prosperity or independent folk: shelter, if you behave
//   resupply – trading posts and stations: food, fuel, repairs
//   wreck    – salvage yards and derelicts: scavenge parts, find the story

export const PYRO_POIS = [
  // ── Pyro I: radioactive storms close to the star ──
  { name: "Rustville", body: "Pyro I", type: "outpost", faction: "Headhunters", kind: "hostile" },
  { name: "Stag's Rut", body: "Pyro I", type: "outpost", faction: "Headhunters", kind: "hostile" },
  { name: "Gray Gardens Depot", body: "Pyro I", type: "storage depot", faction: null, kind: "hostile" },
  { name: "the Derelict Outpost on Pyro I", body: "Pyro I", type: "derelict outpost", faction: null, kind: "wreck" },
  { name: "the ASD facilities in the Pyro I storms", body: "Pyro I", type: "research facility", faction: "ASD", kind: "hostile" },

  // ── Monox (Pyro II) ──
  { name: "Last Ditch", body: "Monox", type: "settlement under a derelict mining rig", faction: "XenoThreat", kind: "hostile" },
  { name: "Ostler's Claim", body: "Monox", type: "mining site", faction: "Headhunters", kind: "hostile" },
  { name: "Jackson's Swap", body: "Monox", type: "salvage yard", faction: "Citizens for Prosperity", kind: "wreck" },
  { name: "Sunset Mesa", body: "Monox", type: "salvage yard", faction: "Citizens for Prosperity", kind: "friendly" },
  { name: "Yang's Place", body: "Monox", type: "outpost", faction: "Citizens for Prosperity", kind: "friendly" },
  { name: "Arid Reach", body: "Monox", type: "trading post", faction: null, kind: "resupply" },
  { name: "Slowburn Depot", body: "Monox", type: "settlement", faction: null, kind: "hostile" },

  // ── Bloom (Pyro III) ──
  { name: "Shepherd's Rest", body: "Bloom", type: "farm", faction: "Citizens for Prosperity", kind: "friendly" },
  { name: "The Yard", body: "Bloom", type: "farm", faction: "Headhunters", kind: "hostile" },
  { name: "Narena's Rest", body: "Bloom", type: "homestead", faction: "Citizens for Prosperity", kind: "friendly" },
  { name: "Shadowfall", body: "Bloom", type: "homestead", faction: "XenoThreat", kind: "hostile" },
  { name: "Bueno Ravine", body: "Bloom", type: "mining site by a huge mining pit", faction: "Citizens for Prosperity", kind: "friendly" },
  { name: "Carver's Ridge", body: "Bloom", type: "mining site", faction: "Headhunters", kind: "hostile" },
  { name: "Windfall", body: "Bloom", type: "salvage yard", faction: "Headhunters", kind: "hostile" },
  { name: "Prospect Depot", body: "Bloom", type: "storage depot", faction: null, kind: "hostile" },
  { name: "Frigid Knot", body: "Bloom", type: "trading post", faction: "Citizens for Prosperity", kind: "resupply" },
  { name: "The Golden Riviera", body: "Bloom", type: "trading post where trespassers get shot", faction: "Headhunters", kind: "hostile" },

  // ── Pyro IV ──
  { name: "Chawla's Beach", body: "Pyro IV", type: "outpost behind a jagged rock sea wall, a busy pit stop", faction: "Citizens for Prosperity", kind: "resupply" },
  { name: "Sacren's Plot", body: "Pyro IV", type: "outpost in a rock canyon, 15 km east of Chawla's Beach", faction: null, kind: "friendly" },
  { name: "Fallow Field", body: "Pyro IV", type: "outpost with big landing pads", faction: "Headhunters", kind: "hostile" },
  { name: "Goner's Deal", body: "Pyro IV", type: "outpost in the middle of a giant impact crater", faction: null, kind: "hostile" },
  { name: "Dinger's Depot", body: "Pyro IV", type: "storage depot", faction: null, kind: "hostile" },
  { name: "the Derelict Outpost on Pyro IV", body: "Pyro IV", type: "derelict outpost", faction: null, kind: "wreck" },
  { name: "the Farro Data Centers", body: "Pyro IV", type: "ASD data centres", faction: "ASD", kind: "hostile" },

  // ── Pyro V's moons ──
  { name: "Kabir's Post", body: "Ignis", type: "outpost", faction: "Citizens for Prosperity", kind: "friendly" },
  { name: "Ashland", body: "Ignis", type: "trading post", faction: "Headhunters", kind: "hostile" },
  { name: "Seer's Canyon", body: "Vatra", type: "outpost", faction: null, kind: "resupply" },
  { name: "Prophet's Peak", body: "Adir", type: "outpost", faction: null, kind: "resupply" },
  { name: "Feo Canyon Depot", body: "Fairo", type: "storage depot", faction: null, kind: "hostile" },
  { name: "the Derelict Outpost on Fairo", body: "Fairo", type: "derelict outpost", faction: null, kind: "wreck" },
  { name: "the Derelict Outpost on Fuego", body: "Fuego", type: "derelict outpost, an old Headhunter stash point", faction: null, kind: "wreck" },

  // ── Terminus (Pyro VI) ──
  { name: "Rough Landing", body: "Terminus", type: "outpost", faction: "Headhunters", kind: "hostile" },
  { name: "Scarper's Turn", body: "Terminus", type: "outpost", faction: "XenoThreat", kind: "hostile" },
  { name: "Watcher's Depot", body: "Terminus", type: "storage depot, deep in their territory", faction: "XenoThreat", kind: "hostile" },
  { name: "Last Landings", body: "Terminus", type: "outpost", faction: "independent", kind: "friendly" },
  { name: "Bullock's Reach", body: "Terminus", type: "farm", faction: "Citizens for Prosperity", kind: "friendly" },
  { name: "Kinder Plots", body: "Terminus", type: "farm", faction: null, kind: "friendly" },
  { name: "Stonetree", body: "Terminus", type: "homestead", faction: null, kind: "friendly" },
  { name: "Canard View", body: "Terminus", type: "trading post", faction: null, kind: "resupply" },
  { name: "Blackrock Exchange", body: "Terminus", type: "trading post", faction: null, kind: "resupply" },
  { name: "Supply Gap", body: "Terminus", type: "salvage yard", faction: null, kind: "wreck" },
];

// Stations, with the Lagrange point or orbit they sit at.
export const PYRO_STATIONS = [
  { name: "Ruin Station", where: "orbiting Terminus", faction: "Rough & Ready", kind: "resupply", contested: true },
  { name: "Checkmate Station", where: "Monox L4 (PYR2-L4)", faction: "Rough & Ready", kind: "resupply", contested: true },
  { name: "Orbituary", where: "orbiting Bloom", faction: "Rough & Ready", kind: "resupply", contested: true },
  { name: "Patch City", where: "Bloom L3 (PYR3-L3)", faction: "Rough & Ready", kind: "resupply" },
  { name: "Starlight Service Station", where: "Bloom L1", faction: "Citizens for Prosperity", kind: "resupply" },
  { name: "Gaslight", where: "Pyro V L2", faction: "Rough & Ready", kind: "resupply" },
  { name: "Rod's Fuel 'N Supplies", where: "Pyro V L4", faction: "Rough & Ready", kind: "resupply" },
  { name: "Rat's Nest", where: "Pyro V L5 (PYR5-L5)", faction: "Rough & Ready", kind: "resupply" },
  { name: "Dudley & Daughters", where: "Terminus L4", faction: "Citizens for Prosperity", kind: "resupply" },
  { name: "Endgame", where: "Terminus L3 (PYR6-L3)", faction: "Rough & Ready", kind: "resupply" },
  { name: "Megumi Refueling", where: "Terminus L5 (PYR6-L5)", faction: "Rough & Ready", kind: "resupply" },
];

const owner = (f) => (!f ? "" : f === "Headhunters" ? "Headhunter " : `${f} `);

// "Carver's Ridge, Bloom (Headhunters mining site)"
export const poiLabel = (p) => `${p.name}, ${p.body} (${owner(p.faction)}${p.type})`;
export const stationLabel = (s) => `${s.name}, ${s.where} (${s.faction}${s.contested ? ", with a contested zone" : ""})`;
