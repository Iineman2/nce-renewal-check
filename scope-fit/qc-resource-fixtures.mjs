// Synthetic boundary fixtures only; never imported by the application.
export function padCsvBytes(source, byteLength) {
  let text = source.endsWith('\n') ? source : source + '\n';
  let remaining = byteLength - new TextEncoder().encode(text).length;
  if (!Number.isInteger(remaining) || remaining < 0) throw new TypeError('Synthetic byte frontier is too small.');
  // Empty quoted lexical records count toward work but not data rows. Each
  // field has exactly 4096 lexical units; no million-record blank padding.
  const record = '""' + ' '.repeat(4094) + '\n';
  text += record.repeat(Math.floor(remaining / record.length)); remaining %= record.length;
  text += remaining >= 3 ? '""' + ' '.repeat(remaining - 3) + '\n' : '\n'.repeat(remaining);
  if (new TextEncoder().encode(text).length !== byteLength) throw new TypeError('Synthetic byte frontier disagrees with its independent byte count.');
  return text;
}

// Simultaneous maximum bytes/cells. Optional fields absorb padding without new records/cells.
export function maximumCellByteCsv(columns, values, targetBytes = 2_000_000) {
  if (columns.length !== 64 || values.length >= 64) throw new TypeError('Expected a64-column fixture and optional padding fields');
  const rows = Array.from({ length: 1023 }, (_, i) => [...values.map(value => value === '$id' ? 's' + i : value), ...Array(64 - values.length).fill('x'.repeat(29))]);
  const assemble = () => [columns.join(','), ...rows.map(row => row.join(','))].join('\n');
  let remaining = targetBytes - new TextEncoder().encode(assemble()).length;
  if (remaining < 0) throw new TypeError('Target cannot retain the fixture records');
  for (let r = rows.length - 1; r >= 0 && remaining; r--) for (let c = 63; c >= values.length && remaining; c--) {
    const amount = Math.min(1024 - rows[r][c].length, remaining); rows[r][c] += 'x'.repeat(amount); remaining -= amount;
  }
  const result = assemble();
  if (remaining || new TextEncoder().encode(result).length !== targetBytes) throw new TypeError('Maximum byte/cell fixture does not match its target');
  return result;
}
