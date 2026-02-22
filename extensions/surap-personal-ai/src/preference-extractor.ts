type PreferenceCandidate = {
  key: string;
  value: string;
  confidence: number;
  importance: number;
  tags?: string[];
};

const PREFERENCE_PATTERNS: Array<{
  pattern: RegExp;
  key: string;
  importance?: number;
}> = [
  { pattern: /\bI prefer\s+(.+)/i, key: "preference.general", importance: 0.8 },
  { pattern: /\bผมชอบ\s+(.+)/i, key: "preference.general", importance: 0.8 },
  { pattern: /\bผมไม่ชอบ\s+(.+)/i, key: "preference.avoid", importance: 0.85 },
  { pattern: /\bตอบสั้น\b/i, key: "response.style", importance: 0.9 },
  { pattern: /\bไม่ต้องอธิบายยาว\b/i, key: "response.style", importance: 0.9 },
];

export function extractPreferenceCandidates(text: string): PreferenceCandidate[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const results: PreferenceCandidate[] = [];
  for (const rule of PREFERENCE_PATTERNS) {
    const match = trimmed.match(rule.pattern);
    if (!match) {
      continue;
    }
    const captured = (match[1] ?? trimmed).trim();
    results.push({
      key: rule.key,
      value: captured,
      confidence: 0.7,
      importance: rule.importance ?? 0.7,
      tags: ["auto-extracted"],
    });
  }

  return dedupeCandidates(results);
}

function dedupeCandidates(items: PreferenceCandidate[]): PreferenceCandidate[] {
  const seen = new Set<string>();
  const out: PreferenceCandidate[] = [];
  for (const item of items) {
    const k = `${item.key}::${item.value}`.toLowerCase();
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(item);
  }
  return out;
}
