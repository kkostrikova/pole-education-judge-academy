const cmp = (a, b) => (Math.abs(a - b) < 1e-9 ? 0 : a < b ? -1 : 1);

export function rankCategory(rows) {
  const ranked = rows
    .filter(r => r.status === 'confirmed' && r.final != null)
    .sort((a, b) => cmp(b.final, a.final) || cmp(b.tiebreak ?? 0, a.tiebreak ?? 0));
  let place = 0;
  const placed = ranked.map((r, i) => {
    const prev = ranked[i - 1];
    if (!prev || cmp(prev.final, r.final) !== 0 || cmp(prev.tiebreak ?? 0, r.tiebreak ?? 0) !== 0) place = i + 1;
    return { ...r, place };
  });
  const rest = rows.filter(r => !ranked.includes(r)).map(r => ({ ...r, place: null }));
  return [...placed, ...rest];
}
