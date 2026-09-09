export interface ParsedContact {
  phone: string;
  name?: string;
  metadata?: Record<string, string>;
}

/** Returns the header columns and data rows from a raw CSV string */
export function parseRawCsvRows(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((l) => splitLine(l));
  return { headers, rows };
}

export interface MetadataColConfig {
  header: string;
  colIndex: number;
  description?: string;
}

/**
 * Builds a list of ParsedContact given explicit column index mappings.
 * metadataCols is an array of { header, colIndex, description? } for any extra context columns.
 */
export function buildContactsFromMapping(
  rows: string[][],
  phoneIdx: number,
  nameIdx: number | null,
  metadataCols: MetadataColConfig[]
): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  for (const cols of rows) {
    const phone = cols[phoneIdx]?.trim();
    if (!phone) continue;
    const name = nameIdx !== null ? cols[nameIdx]?.trim() || undefined : undefined;
    const metadata: Record<string, string> = {};
    for (const { header, colIndex, description } of metadataCols) {
      const val = cols[colIndex]?.trim();
      if (val) metadata[header] = val;
      if (description?.trim()) {
        metadata[`${header}_description`] = description.trim();
      }
    }
    contacts.push({ phone, name, metadata: Object.keys(metadata).length > 0 ? metadata : undefined });
  }
  return contacts;
}

/**
 * Parses a simple CSV/pasted-text contact list. Accepts an optional header row
 * (phone,name in any order) or bare "phone,name" / "phone" lines.
 */
export function parseContactsCsv(text: string): ParsedContact[] {
  const { headers, rows } = parseRawCsvRows(text);
  if (headers.length === 0) return [];

  const lower = headers.map((c) => c.toLowerCase());
  let phoneIdx = 0;
  let nameIdx: number | null = 1;

  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('number')) {
    phoneIdx = lower.findIndex((h) => h === 'phone' || h === 'mobile' || h === 'number');
    const nameCol = lower.findIndex((h) => h === 'name');
    nameIdx = nameCol !== -1 ? nameCol : null;
  }

  return buildContactsFromMapping(rows, phoneIdx, nameIdx, []);
}

function splitLine(line: string): string[] {
  return line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
}
