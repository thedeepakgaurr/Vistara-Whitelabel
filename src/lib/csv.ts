export interface ParsedContact {
  phone: string;
  name?: string;
}

/**
 * Parses a simple CSV/pasted-text contact list. Accepts an optional header row
 * (phone,name in any order) or bare "phone,name" / "phone" lines.
 */
export function parseContactsCsv(text: string): ParsedContact[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  let phoneIdx = 0;
  let nameIdx: number | null = 1;
  let start = 0;

  const firstCols = splitLine(lines[0]);
  const lower = firstCols.map((c) => c.toLowerCase());
  if (lower.includes('phone')) {
    phoneIdx = lower.indexOf('phone');
    nameIdx = lower.includes('name') ? lower.indexOf('name') : null;
    start = 1;
  }

  const contacts: ParsedContact[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const phone = cols[phoneIdx]?.trim();
    if (!phone) continue;
    const name = nameIdx !== null ? cols[nameIdx]?.trim() : undefined;
    contacts.push({ phone, name: name || undefined });
  }
  return contacts;
}

function splitLine(line: string): string[] {
  return line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
}
