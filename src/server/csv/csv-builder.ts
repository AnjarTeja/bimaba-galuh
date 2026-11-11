function spreadsheetSafe(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(
  rows: readonly (readonly unknown[])[],
  headers?: readonly string[],
): string {
  const allRows: readonly (readonly unknown[])[] = headers
    ? [headers, ...rows]
    : rows;
  return allRows.map((row) => row.map(spreadsheetSafe).join(",")).join("\r\n");
}
