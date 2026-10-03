export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  while (copy.length && out.length < n) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

export const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export const PRONOUNS = {
  she: { they: "she", them: "her", their: "her", theyre: "she's", label: "she/her" },
  he: { they: "he", them: "him", their: "his", theyre: "he's", label: "he/him" },
  they: { they: "they", them: "them", their: "their", theyre: "they're", label: "they/them" },
};

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Fills {placeholders}. Pronoun keys: {they} {them} {their} {They're} etc. ({They} capitalises).
export function fill(template, vars, pronounKey = "they") {
  const p = PRONOUNS[pronounKey] || PRONOUNS.they;
  const pron = {
    they: p.they, them: p.them, their: p.their, "they're": p.theyre,
    They: cap(p.they), Them: cap(p.them), Their: cap(p.their), "They're": cap(p.theyre),
  };
  return template.replace(/\{([A-Za-z0-9_']+)\}/g, (m, key) => {
    if (key in vars && vars[key] != null) return String(vars[key]);
    if (key in pron) return pron[key];
    return m;
  });
}
