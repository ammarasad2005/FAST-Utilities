/**
 * Rebuild text lines from PDF.js text items while keeping the seating sheet's
 * two physical columns separate. This preserves the page-local course heading
 * associated with each column and prevents adjacent students from merging.
 */

export interface PdfTextItemLike {
  str: string;
  transform: number[];
}

export function extractSeatingPageLines(items: PdfTextItemLike[], pageWidth: number): string[] {
  const midpoint = pageWidth / 2;
  const rows = new Map<number, { left: PdfTextItemLike[]; right: PdfTextItemLike[] }>();

  for (const item of items) {
    if (!item.str?.trim() || !Array.isArray(item.transform) || item.transform.length < 6) continue;
    const x = item.transform[4];
    const y = Math.round(item.transform[5] * 2) / 2;
    let row = rows.get(y);
    if (!row) {
      row = { left: [], right: [] };
      rows.set(y, row);
    }
    (x < midpoint ? row.left : row.right).push(item);
  }

  const output: string[] = [];
  const ordered = [...rows.entries()].sort((a, b) => b[0] - a[0]);
  for (const [, row] of ordered) {
    const laneLine = (laneItems: PdfTextItemLike[]) => laneItems
      .sort((a, b) => a.transform[4] - b.transform[4])
      .map((item) => item.str.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const left = laneLine(row.left);
    const right = laneLine(row.right);
    const isStudentRow = (line: string) => /^\s*\d+\s+(?:\d{2}[A-Z]-\d{4}|[A-Z]\d{6})\b/i.test(line);
    const isSeatOnly = (line: string) => /^(?:\d{1,3}|Extra\s+\d+|[A-Z]\d{1,2}R\d{1,2})[,;.]?$/i.test(line);

    // Some plans use one full-width table: the roll/name cells fall left of
    // the physical midpoint while a numeric seat cell falls in the right lane.
    // Rejoin that seat only when the opposite lane is otherwise a single seat
    // token; independent two-column student rows stay in separate lanes.
    if (isStudentRow(left) && isSeatOnly(right)) {
      output.push(`[[L]] ${left} ${right.replace(/[,;.]$/, '')}`);
      continue;
    }
    if (isStudentRow(right) && isSeatOnly(left)) {
      output.push(`[[R]] ${right} ${left.replace(/[,;.]$/, '')}`);
      continue;
    }
    if (left) output.push(`[[L]] ${left}`);
    if (right) output.push(`[[R]] ${right}`);
  }
  return output;
}
