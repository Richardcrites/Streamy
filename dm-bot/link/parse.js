// Reads Star Citizen Game.log lines (Alpha 4.10 format) and turns the ones that matter for the
// story into small events. Read-only: this never touches the game. No dependencies, so the
// DM Link companion runs on any PC with Node.js.

const STANTON_BODIES = {
  1: "Hurston", "1a": "Arial", "1b": "Aberdeen", "1c": "Magda", "1d": "Ita",
  2: "Crusader", "2a": "Cellin", "2b": "Daymar", "2c": "Yela",
  3: "ArcCorp", "3a": "Lyria", "3b": "Wala",
  4: "microTech", "4a": "Calliope", "4b": "Clio", "4c": "Euterpe",
};
const PYRO = { 1: "Pyro I", 2: "Monox (Pyro II)", 3: "Bloom (Pyro III)", 4: "Pyro IV", 5: "Pyro V", 6: "Terminus (Pyro VI)" };
const RR_BODY = { CRU: "Crusader", HUR: "Hurston", ARC: "ArcCorp", MIC: "microTech", S1: "Hurston", S2: "Crusader", S3: "ArcCorp", S4: "microTech" };
const CITIES = { Lorville: "Lorville (Hurston)", Orison: "Orison (Crusader)", Area18: "Area18 (ArcCorp)", NewBabbage: "New Babbage (microTech)" };
const SYSTEMS = { stan: "Stanton", stanton: "Stanton", pyro: "Pyro", nyx: "Nyx", castra: "Castra" };

const point = (p) => (p === "LEO" ? "low orbit" : p.toUpperCase());
const bodyName = (code) => {
  const pyro = code.match(/^P(\d)$/i);
  if (pyro) return PYRO[pyro[1]];
  return RR_BODY[code.toUpperCase()] || code;
};

// Internal location codes → names a player recognises. Unknown codes fall back to something readable.
export function prettyPlace(code) {
  if (!code) return null;
  let m;
  if ((m = code.match(/^Stanton\d_(\w+)$/)) && CITIES[m[1]]) return CITIES[m[1]];
  if ((m = code.match(/^Stanton(\d[a-d]?)_ASD_Delve_Facility/i))) return `ASD Onyx facility on ${STANTON_BODIES[m[1]] || "a Stanton moon"}`;
  if ((m = code.match(/^Stanton(\d[a-d]?)_/))) return `${code.replace(/^Stanton\d[a-d]?_/, "").replace(/_/g, " ")} (${STANTON_BODIES[m[1]] || "Stanton"})`;
  if ((m = code.match(/^RR_JP_([A-Z][a-z]+)([A-Z][a-z]+)$/))) return `${m[1]}–${m[2]} jump point station`;
  if ((m = code.match(/^(?:LOC_)?RR_([A-Z0-9]+)_(L\d|LEO)$/i))) return `Rest stop at ${bodyName(m[1])} ${point(m[2])}`;
  if (/Keeger/i.test(code)) return "an asteroid base in the Keeger Belt (Nyx)";
  if (/Glaciem/i.test(code)) return "the Glaciem Ring (Nyx)";
  if (/Levski/i.test(code)) return "Levski (Nyx)";
  return code.replace(/_\d{3,}$/, "").replace(/_/g, " ");
}

// Quantum targets use a different set of codes.
export function prettyTarget(code) {
  if (!code) return null;
  let m;
  if ((m = code.match(/^(?:LOC_)?rs_ext_([a-z]+)-([a-z]+)_jp\d$/i))) return `the ${SYSTEMS[m[1].toLowerCase()] || m[1]}–${SYSTEMS[m[2].toLowerCase()] || m[2]} jump point`;
  if ((m = code.match(/^rs_ext_pyro(\d)_(l\d|leo)$/i))) return `the station at ${PYRO[m[1]]} ${point(m[2].toUpperCase())}`;
  if ((m = code.match(/^pyro(\d)$/i))) return PYRO[m[1]];
  if ((m = code.match(/^(\w+?)_LOC$/)) && CITIES[m[1]]) return CITIES[m[1]];
  if ((m = code.match(/^OOC_Stanton_(\d[a-d]?)_/))) return STANTON_BODIES[m[1]];
  if (/^(LOC_)?RR_/i.test(code)) return prettyPlace(code.replace(/^LOC_/i, ""));
  if (/keeger/i.test(code)) return "the Keeger Belt (Nyx)";
  if (/^ab_mine_pyro|_ab_pyro/i.test(code)) return "an asteroid base in Pyro";
  if (/^PartyMemberMarker/i.test(code)) return "a party member";
  if (/^UnattendedVehicleMarker/i.test(code)) return "their parked ship";
  if (/^(NavPoint_Dynamic|MISSION_QT)/i.test(code)) return "a mission marker";
  return code.replace(/_\d{6,}$/, "").replace(/_/g, " ");
}

// "Verified Bounty: X at QV Breaker Station <EMN>[150 Rep] [BP]*</EMN>:" → "Verified Bounty: X at QV Breaker Station"
const cleanTitle = (t) => t
  .replace(/<EMN>.*?(<\/EMN>|$)/g, "")
  .replace(/<[^>]+>/g, "")
  .replace(/~mission\([^)]*\)/g, "a location")
  .replace(/(\s*\[[^\]]*\]\*?)+\s*:?\s*$/, "")
  .replace(/\s*:\s*$/, "")
  .replace(/\s+/g, " ")
  .trim();
const SEVERITY = { Minor: "minor", Moderate: "major", Severe: "critical" };

// Stateful parser: some events (a quantum arrival) need context from earlier lines.
export function createParser() {
  const state = { quantumTarget: null, ship: null, jurisdiction: null, handle: null };

  return function parseLine(line) {
    const ts = line.match(/^<([^>]+)>/)?.[1] || null;
    const ev = (type, data = {}) => ({ type, at: ts, ...data });
    let m;

    if ((m = line.match(/Player\[([^\]]+)\] requested inventory for Location\[([^\]]+)\]/))) {
      state.handle ??= m[1];
      return ev("location", { place: prettyPlace(m[2]), code: m[2] });
    }
    if ((m = line.match(/selected point (\S+) as their destination/))) {
      // Setting a quantum destination is the moment the crew spools: the DM rolls that jump.
      const repeat = state.quantumTarget === m[1];
      state.quantumTarget = m[1];
      const to = prettyTarget(m[1]);
      return to && !repeat ? ev("quantum_spool", { place: to }) : null;
    }
    if (line.includes("<Quantum Drive Arrived - Arrived at Final Destination>")) {
      const to = prettyTarget(state.quantumTarget);
      state.quantumTarget = null;
      return to ? ev("quantum", { place: to }) : null;
    }
    if ((m = line.match(/You have joined channel '(.+?) : ([^']+)'/))) {
      state.handle ??= m[2];
      if (/\bParty\b|General|Global/i.test(m[1]) || m[1] === state.ship) return null;
      state.ship = m[1];
      return ev("ship", { ship: m[1] });
    }
    if ((m = line.match(/<MED BED HEAL>.*?Success.*?head: (true|false) torso: (true|false) leftArm: (true|false) rightArm: (true|false) leftLeg: (true|false) rightLeg: (true|false)/))) {
      const names = ["head", "torso", "left arm", "right arm", "left leg", "right leg"];
      const parts = names.filter((_, i) => m[i + 1] === "true");
      return ev("medbed", { parts });
    }

    const note = line.match(/<SHUDEvent_OnNotification> Added notification "([^"\n]*)/)?.[1];
    if (!note) return null;
    if ((m = note.match(/^Contract (Accepted|Shared|Complete|Completed|Withdrawn|Failed|Abandoned):\s*(.+)/))) {
      const kind = { Accepted: "accepted", Shared: "shared", Complete: "complete", Completed: "complete", Withdrawn: "withdrawn", Failed: "failed", Abandoned: "withdrawn" }[m[1]];
      return ev(`contract_${kind}`, { title: cleanTitle(m[2]) });
    }
    if ((m = note.match(/^Objective Complete:\s*(.+)/))) return ev("objective", { text: cleanTitle(m[1]) });
    if (note.startsWith("CrimeStat Rating Increased")) return ev("crimestat");
    if ((m = note.match(/^Fined ([\d,]+) UEC/))) return ev("fined", { amount: Number(m[1].replace(/,/g, "")) });
    if ((m = note.match(/^Awarded ([\d,]+) aUEC/))) return ev("earned", { amount: Number(m[1].replace(/,/g, "")) });
    if ((m = note.match(/^(Minor|Moderate|Severe) Injury Detected - ([A-Za-z ]+?) - Tier (\d)/))) {
      return ev("injury", { severity: SEVERITY[m[1]], label: m[1], part: m[2].trim().toLowerCase(), tier: Number(m[3]) });
    }
    if (note.startsWith("Standby, Local Emergency Services Are En Route")) return ev("downed");
    if ((m = note.match(/^Entered (.+?) Jurisdiction/))) {
      if (m[1] === state.jurisdiction) return null;
      state.jurisdiction = m[1];
      return ev("jurisdiction", { name: m[1] });
    }
    return null;
  };
}

// One-line, human-readable text for an event (what shows up in the Discord feed channel).
export function describe(e) {
  switch (e.type) {
    case "location": return `📍 At ${e.place}`;
    case "quantum_spool": return `🌀 Spooling for ${e.place}`;
    case "quantum": return `🌀 Quantum jump to ${e.place}`;
    case "ship": return `🚀 Boarded: ${e.ship}`;
    case "medbed": return `🩺 Med bed surgery${e.parts.length ? ` (${e.parts.join(", ")})` : ""}`;
    case "contract_accepted": return `📜 Contract accepted: ${e.title}`;
    case "contract_shared": return `🤝 Contract shared: ${e.title}`;
    case "contract_complete": return `✅ Contract complete: ${e.title}`;
    case "contract_withdrawn": return `↩️ Contract withdrawn: ${e.title}`;
    case "contract_failed": return `❌ Contract failed: ${e.title}`;
    case "objective": return `☑️ Objective complete: ${e.text}`;
    case "crimestat": return "🚨 CrimeStat rating increased";
    case "fined": return `💸 Fined ${e.amount.toLocaleString("en-US")} UEC`;
    case "earned": return `💰 Earned ${e.amount.toLocaleString("en-US")} aUEC`;
    case "injury": return `🩸 ${e.label} injury: ${e.part} (Tier ${e.tier} treatment)`;
    case "downed": return "🚑 Went down; emergency services en route";
    case "jurisdiction": return `🛡️ Entered ${e.name} jurisdiction`;
    default: return e.type;
  }
}
