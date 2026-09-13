// Debug helper: inlines $1, $2... so the logged query can be pasted into a SQL client
function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  const text = typeof value === 'string' ? value : JSON.stringify(value);

  return `'${text.replace(/'/g, "''")}'`;
}

export function inlineParams(query: string, params: string): string {
  let values: unknown[];
  try {
    values = JSON.parse(params) as unknown[];
  } catch {
    return `${query}\n-- could not parse params: ${params}`;
  }

  return query.replace(/\$(\d+)/g, (placeholder, index: string) => {
    const i = Number(index) - 1;

    return i < values.length ? toSqlLiteral(values[i]) : placeholder;
  });
}
