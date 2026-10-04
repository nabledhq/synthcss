// resolve_intent: deterministic keyword scoring against the contract's `intents`
// section. No model, no randomness: the same request and contract give the same answer.

// Words that carry no layout or component meaning.
const STOPWORDS = new Set(
  ("a an the of that which who to with without and or for in on at by from into onto as is are be been it its this these those " +
    "my our your their i we you me us they them some any each every all very just so then than also please can could will would " +
    "should want need needs make makes put use using add create build show shows have has get let like").split(" "),
);

// Minimum score of a match: at least one query word covered by a contract keyword.
export const MIN_SCORE = 1;
// Bonus per matched multi-word keyword, so "main content" beats two loose words.
export const PHRASE_BONUS = 0.5;
export const MAX_ALTERNATIVES = 3;

const undouble = (w) => (/([b-df-hj-np-tv-z])\1$/.test(w) ? w.slice(0, -1) : w);

// A light English stemmer: enough to match "wraps", "wrapping" and "wrap".
export function stem(word) {
  if (word.length > 5 && word.endsWith("ing")) return undouble(word.slice(0, -3));
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && /(ss|sh|ch|x|z)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ed")) return undouble(word.slice(0, -2));
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

export function buildIntentIndex(intents) {
  return intents.map((entry, order) => ({
    ...entry,
    order,
    phrases: entry.keywords.map(normalize).filter((p) => p.length > 0),
  }));
}

// Distinct query words covered by the entry's keywords, plus a bonus per phrase.
export function scoreEntry(entry, tokens) {
  const covered = new Set();
  let phrases = 0;
  for (const phrase of entry.phrases) {
    for (let i = 0; i + phrase.length <= tokens.length; i++) {
      if (phrase.every((word, j) => tokens[i + j] === word)) {
        phrase.forEach((_, j) => covered.add(i + j));
        if (phrase.length > 1) phrases++;
        break;
      }
    }
  }
  return covered.size + PHRASE_BONUS * phrases;
}

const describe = (entry, score) => ({
  class: `.${entry.class}`,
  classes: [...(entry.with ?? []), entry.class].join(" "),
  ...(entry.attribute ? { attribute: entry.attribute } : {}),
  reason: entry.reason,
  score,
});

export function resolveIntent(index, text) {
  const tokens = normalize(text);
  const ranked = index
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.entry.order - b.entry.order);
  if (!ranked.length) {
    return {
      error: "no-match",
      intent: text,
      message: `No contract intent scored at least ${MIN_SCORE}. Describe the layout or component in plain words (e.g. "row of buttons that wraps"), or call list_components / list_layouts.`,
    };
  }
  const [best, ...rest] = ranked;
  const key = (e) => `${e.class}|${e.attribute ?? ""}`;
  const seen = new Set([key(best.entry)]);
  const alternatives = [];
  for (const r of rest) {
    if (alternatives.length === MAX_ALTERNATIVES) break;
    if (seen.has(key(r.entry))) continue;
    seen.add(key(r.entry));
    alternatives.push(describe(r.entry, r.score));
  }
  return { ...describe(best.entry, best.score), ...(alternatives.length ? { alternatives } : {}) };
}
