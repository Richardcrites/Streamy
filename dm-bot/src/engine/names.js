// Fresh NPC names, every time. Every name the bot hands out is registered per server. A full name
// is never reused, and first names/surnames can't repeat (or nearly repeat, so no "Ysolde" after
// "Ysolda") among recent names. If the pools somehow run dry, a syllable generator invents more.

import { pick } from "./util.js";

const FIRST = [
  "Adaeze", "Alder", "Amara", "Anselm", "Arlo", "Astrid", "Aurek", "Bastian", "Beatrix", "Benedikt", "Bexley", "Bodhi",
  "Caius", "Calloway", "Cassia", "Cato", "Cillian", "Corin", "Dagny", "Dashiell", "Delphine", "Desmond", "Dove", "Draven",
  "Edda", "Elio", "Emeric", "Esme", "Evander", "Faisal", "Fenna", "Florin", "Gage", "Galen", "Greer", "Gunnar",
  "Halvard", "Hesper", "Huxley", "Ignatius", "Ilka", "Imani", "Inigo", "Isidore", "Jaro", "Jessamy", "Joaquin", "Juniper",
  "Kaito", "Kalinda", "Kasimir", "Keturah", "Kip", "Kofi", "Lazlo", "Leocadia", "Linnea", "Lorcan", "Lucan", "Lyra",
  "Magnus", "Marisol", "Matthias", "Mercy", "Mikkel", "Mireille", "Nadia", "Nikolai", "Noor", "Octavian", "Odalys", "Orla",
  "Osric", "Paz", "Peregrine", "Petra", "Quill", "Radomir", "Rafferty", "Reza", "Rhiannon", "Roque", "Rosalind", "Ruadh",
  "Sabine", "Sasha", "Saoirse", "Selwyn", "Seraphina", "Silvio", "Solene", "Soren", "Tamsin", "Tavish", "Thaddeus", "Theda",
  "Tobias", "Ulric", "Una", "Valentin", "Vashti", "Vaughn", "Veda", "Wilhelmina", "Wolfe", "Xavi", "Yara", "Yusuf",
  "Zainab", "Zaria", "Zeno", "Zuri", "Bram", "Catalina", "Dmitri", "Elspeth", "Farrah", "Gideon", "Honora", "Ivo",
];

const LAST = [
  "Abernathy", "Achterberg", "Adeyemi", "Albrecht", "Arkwright", "Bale", "Barrowclough", "Bellweather", "Blackthorn",
  "Bramwell", "Cardenas", "Carrow", "Castellanos", "Chikwanha", "Coldwater", "Corrigan", "Crowhurst", "Dalca", "Darrow",
  "Delacourt", "Drummond", "Duvall", "Eastwick", "Ekwueme", "Ellery", "Faraday", "Farrow", "Fennimore", "Galloway",
  "Garrick", "Gilchrist", "Greaves", "Hadley", "Halloran", "Hargreave", "Hawthorne", "Iorwerth", "Ishikawa", "Jankowski",
  "Kaczmarek", "Kestrel", "Kincaid", "Kowalczyk", "Lachance", "Larkspur", "Lindgren", "Lockwood", "Mabry", "Maddox",
  "Marchetti", "Montague", "Moreau", "Mwangi", "Nakagawa", "Novak", "Okonedo", "Oyelowo", "Pemberton", "Petrakis",
  "Quarles", "Quintero", "Radcliffe", "Ravenscroft", "Reinholt", "Rosenthal", "Salazar", "Sandoval", "Sarkissian", "Shaw",
  "Sinclair", "Stavros", "Strickland", "Szabo", "Takahashi", "Thorne", "Tolliver", "Underhill", "Valdez", "Vasquez",
  "Vickers", "Voskuijlen", "Wainwright", "Whitlock", "Winterbourne", "Wolanski", "Yamamoto", "Yardley", "Zamora", "Zelenko",
  "Okafor-Lind", "Brightwater", "Ironwood", "Ashgrove", "Stonebridge", "Coldridge", "Harrowgate", "Merriman", "Pryce",
];

const SYL_A = ["ka", "ve", "mo", "ri", "sa", "lu", "da", "ne", "to", "ar", "il", "or", "be", "ze", "qu", "ha", "fe", "jo"];
const SYL_B = ["ran", "len", "dor", "vik", "sel", "mar", "tis", "ven", "lor", "dan", "ric", "sha", "bel", "kov", "nis", "rek"];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");

export function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

// "Pike" ~ "Pyke", "Ysolde" ~ "Ysolda", "Vance" ~ "Vance".
export function similar(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (Math.min(x.length, y.length) < 4) return false;
  return levenshtein(x, y) <= 1 || (x.length >= 5 && y.length >= 5 && x.slice(0, 5) === y.slice(0, 5));
}

export const firstName = (full) => full.replace(/".*?"\s*/, "").trim().split(/\s+/)[0];
export const lastName = (full) => {
  const parts = full.replace(/".*?"\s*/, "").trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

function registry(g) {
  g.usedNames ??= [];
  return g.usedNames;
}

export function registerName(g, full) {
  const used = registry(g);
  if (!used.includes(full)) used.push(full);
}

const RECENT = 80;

// Taken if: the exact name was ever used; the first name or surname is (nearly) the same as one of
// the last 80 names handed out; or the surname is similar to a player character's (that would make
// an accidental family tie; real ties come from players' own name choices).
function taken(g, full) {
  const used = registry(g);
  const f = firstName(full);
  const l = lastName(full);
  const key = norm(full);
  if (used.some((u) => norm(u) === key)) return true;
  const recent = used.slice(-RECENT);
  if (recent.some((u) => similar(firstName(u), f))) return true;
  if (l && recent.some((u) => similar(lastName(u), l))) return true;
  if (l && Object.values(g.characters || {}).some((c) => similar(lastName(c.name), l))) return true;
  return false;
}

const invent = (pool) => {
  const s = pick(SYL_A) + pick(SYL_B) + (Math.random() < 0.4 ? pick(["a", "o", "i", "e", ""]) : "");
  return pool === "last" && Math.random() < 0.5 ? s + pick(["son", "ova", "ez", "ski", "worth", "er"]) : s;
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// A brand-new NPC name for this server, registered so it's never handed out again.
export function freshName(g) {
  for (let i = 0; i < 400; i++) {
    const useInvented = i > 300;
    const name = `${useInvented ? cap(invent("first")) : pick(FIRST)} ${useInvented ? cap(invent("last")) : pick(LAST)}`;
    if (!taken(g, name)) {
      registerName(g, name);
      return name;
    }
  }
  const name = `${cap(invent("first"))} ${cap(invent("last"))}-${Math.floor(Math.random() * 90 + 10)}`;
  registerName(g, name);
  return name;
}

// Player-facing name suggestions skip anything already in use on the server.
export const isTaken = taken;
