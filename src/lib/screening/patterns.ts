/**
 * Keyword patterns for TEXTAREA screening analysis.
 *
 * All patterns are matched case-insensitively against the full text.
 * Word-boundary matching (\b) is used where appropriate to avoid
 * false positives on substrings (e.g. "stablemate" matching "unstable").
 */

export const DEROGATORY_EX_LABELS = [
  "crazy",
  "insane",
  "psycho",
  "manipulative",
  "unstable",
  "bipolar",
  "obsessed",
  "stalker",
  "narcissist",
  "toxic",
  "abusive",
  "delusional",
  "hysterical",
  "unhinged",
  "sociopath",
];

export const BLAME_SHIFTING_MARKERS = [
  "she made me",
  "he made me",
  "they made me",
  "their fault",
  "her fault",
  "his fault",
  "wasn't my fault",
  "not my fault",
  "nothing i could do",
  "i did nothing wrong",
  "i didn't do anything",
  "never my fault",
  "always blamed me",
  "falsely accused",
];

export const SELF_VICTIMIZATION_MARKERS = [
  "i was the only one",
  "i gave everything",
  "i sacrificed",
  "i did all the work",
  "i was too good",
  "they didn't deserve me",
  "they took advantage",
  "i was too nice",
  "nice guys finish last",
];

export const ACCOUNTABILITY_INDICATORS = [
  "i learned",
  "i could have",
  "my mistake",
  "i realized",
  "i contributed",
  "i should have",
  "i grew",
  "i wasn't perfect",
  "my fault",
  "i take responsibility",
  "i need to work on",
  "i was wrong",
  "we both",
  "mutual",
  "we grew apart",
  "incompatible",
];

export const ABUSE_MINIMIZING_PATTERNS = [
  "not a big deal",
  "just a joke",
  "too sensitive",
  "overreacting",
  "can't take a joke",
  "boys will be boys",
  "that's just how",
  "lighten up",
  "get over it",
  "toughen up",
];

/**
 * Count how many patterns from a list appear in the text.
 * Uses word-boundary matching for single-word patterns and
 * plain includes for multi-word phrases.
 */
export function countPatternMatches(
  text: string,
  patterns: string[],
): { count: number; matched: string[] } {
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const pattern of patterns) {
    if (pattern.includes(" ")) {
      if (lower.includes(pattern.toLowerCase())) {
        matched.push(pattern);
      }
    } else {
      const regex = new RegExp(`\\b${pattern}\\b`, "i");
      if (regex.test(lower)) {
        matched.push(pattern);
      }
    }
  }

  return { count: matched.length, matched };
}
