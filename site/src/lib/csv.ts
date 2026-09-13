export function toCsv(rows: Record<string, unknown>[], explicitHeaders?: string[]): string {
  const headers = explicitHeaders ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
  if (headers.length === 0) return "";

  const escape = (value: unknown): string => {
    if (value == null) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
