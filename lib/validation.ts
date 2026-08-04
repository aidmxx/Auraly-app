export type ValidationResult = { valid: true } | { valid: false; error: string };

type TextRule = {
  label: string;
  minWords: number;
  minCharacters: number;
  maxWords: number;
};

const placeholderTokens = new Set([
  "a", "b", "c", "abc", "abcd", "test", "testing", "asdf", "qwerty",
  "none", "nothing", "na", "n/a", "xxx", "sample", "random",
]);

const fallbackWordsIn = (value: string) =>
  value.match(/\p{Script=Han}|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];

const wordsIn = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    return Array.from(segmenter.segment(trimmed))
      .filter((segment) => segment.isWordLike)
      .map((segment) => segment.segment);
  }

  return fallbackWordsIn(trimmed);
};

// Chinese conveys a comparable amount of meaning in substantially fewer
// characters than space-delimited languages. Keep the word/token requirement,
// but scale the secondary character floor so valid Chinese input is not rejected.
const minimumCharactersFor = (value: string, rule: TextRule) =>
  /\p{Script=Han}/u.test(value)
    ? Math.min(rule.minCharacters, rule.minWords * 2)
    : rule.minCharacters;

function looksLikeFiller(value: string, tokens: string[]) {
  const compact = value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (!compact) return true;
  if (/^(.)\1{2,}$/.test(compact)) return true;
  const isAscii = /^[a-z0-9]+$/.test(compact);
  if (isAscii && "abcdefghijklmnopqrstuvwxyz".includes(compact) && compact.length <= 8) return true;
  if (isAscii && "zyxwvutsrqponmlkjihgfedcba".includes(compact) && compact.length <= 8) return true;
  if (tokens.every((token) => placeholderTokens.has(token.toLowerCase()))) return true;
  if (!isAscii) return false;
  const meaningful = tokens.filter((token) => token.length >= 3 && /[aeiouy]/i.test(token));
  return meaningful.length < Math.min(2, tokens.length);
}

export function validateReadableText(value: string, rule: TextRule): ValidationResult {
  const trimmed = value.trim();
  const tokens = wordsIn(trimmed);
  if (trimmed.length < minimumCharactersFor(trimmed, rule) || tokens.length < rule.minWords) {
    return { valid: false, error: `${rule.label} needs at least ${rule.minWords} meaningful words. Please add a little more detail.` };
  }
  if (tokens.length > rule.maxWords) {
    return { valid: false, error: `${rule.label} must be ${rule.maxWords} words or fewer.` };
  }
  if (looksLikeFiller(trimmed, tokens)) {
    return { valid: false, error: `${rule.label} does not appear readable or meaningful. Please rewrite it using ordinary words.` };
  }
  return { valid: true };
}

export function validateSupportRequest(
  condition: "A" | "B" | "C",
  inputs: Partial<Record<string, string>>,
  scaffolds: Array<{ question: string; answer: string }>,
): ValidationResult {
  const checks = condition === "A"
    ? [validateReadableText(inputs.message ?? "", { label: "Your message", minWords: 5, minCharacters: 20, maxWords: 250 })]
    : [
        validateReadableText(inputs.topic ?? "", { label: "Reflection topic", minWords: 2, minCharacters: 6, maxWords: 30 }),
        validateReadableText(inputs.context ?? "", { label: "Relevant context", minWords: 5, minCharacters: 20, maxWords: 250 }),
        validateReadableText(inputs.goal ?? "", { label: "Writing goal", minWords: 3, minCharacters: 12, maxWords: 60 }),
      ];

  if (condition === "C") {
    scaffolds.forEach((scaffold, index) => {
      checks.push(validateReadableText(scaffold.answer, {
        label: `Scaffold answer ${index + 1}`,
        minWords: 4,
        minCharacters: 15,
        maxWords: 150,
      }));
    });
  }

  return checks.find((result) => !result.valid) ?? { valid: true };
}

export function validateFinalReflection(value: string): ValidationResult {
  const base = validateReadableText(value, {
    label: "Final reflection",
    minWords: 30,
    minCharacters: 100,
    maxWords: 1500,
  });
  if (!base.valid) return base;

  const trimmed = value.trim();
  const sentences = trimmed.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const questions = sentences.filter((sentence) => sentence.includes("?")).length;
  if (questions >= 2 && questions >= Math.ceil(sentences.length / 2)) {
    return { valid: false, error: "The final submission appears to contain mostly questions. Please write your own reflective response before submitting." };
  }
  if (/^(sure|happy to help|could you tell me|please provide|to help you)/i.test(trimmed)) {
    return { valid: false, error: "The final submission appears to be AI guidance rather than your reflection. Please replace it with your own reflective writing." };
  }
  return { valid: true };
}
