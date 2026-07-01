// libs/application/src/matches/fixture-text.ts
// Pure parser for free-text fixture queries ("Real Madrid vs Barcelona"). Splits on the
// common separators (vs / v / x / - / – / —, whitespace-delimited so intra-name hyphens
// like "Saint-Étienne" survive) and normalizes whitespace. Deterministic, no IO.

export interface ParsedFixture {
  readonly home: string;
  /** null when the query names a single team (a one-sided search). */
  readonly away: string | null;
}

// A separator is a standalone token surrounded by whitespace: vs / vs. / v / v. / x / - / – / —.
const SEPARATOR = /\s+(?:vs?\.?|x|-|–|—)\s+/i;

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function parseFixtureText(raw: string): ParsedFixture | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const parts = trimmed
    .split(SEPARATOR)
    .map(normalize)
    .filter((part) => part.length > 0);

  if (parts.length === 0) return null;
  if (parts.length === 1) return { home: parts[0], away: null };
  return { home: parts[0], away: parts[1] };
}
