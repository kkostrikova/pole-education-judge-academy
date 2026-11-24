export function parseRoster(text) {
  const rows = [];
  const errors = [];
  const lines = text.split(/\r?\n/).map(l => l.trimEnd()).filter(Boolean);
  lines.forEach((line, i) => {
    const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const cells = splitLine(line, sep).map(c => c.trim());
    const no = Number(cells[0]);
    if (i === 0 && !Number.isInteger(no)) return; // header row
    if (!Number.isInteger(no) || no <= 0) { errors.push(`Рядок ${i + 1}: перша колонка — стартовий номер`); return; }
    if (!cells[1]) { errors.push(`Рядок ${i + 1}: немає імені / назви`); return; }
    rows.push({ start_no: no, athlete_name: cells[1], club: cells[2] ?? '', coach: cells[3] ?? '', members: cells[4] ?? '' });
  });
  const nums = rows.map(r => r.start_no);
  const dup = [...new Set(nums.filter((n, i) => nums.indexOf(n) !== i))];
  if (dup.length) errors.push(`Повторюються стартові номери: ${dup.join(', ')}`);
  return { rows, errors };
}

function splitLine(line, sep) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
