const round6 = (x) => (x == null ? null : Math.round(x * 1e6) / 1e6 + 0);

export function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function trimmedMean(xs) {
  if (xs.length >= 4) {
    const sorted = [...xs].sort((a, b) => a - b);
    return mean(sorted.slice(1, -1));
  }
  return mean(xs);
}

export function performanceResult(kind, sheets) {
  const totals = (panel) => sheets.filter(s => s.panel === panel).map(s => s.total);
  const dsq = sheets.some(s => s.dsq);

  if (kind === 'art') {
    const art = sheets.filter(s => s.panel === 'art');
    const headPenalties = mean(totals('head')) ?? 0;
    const artMean = mean(art.map(s => s.total));
    return {
      technical: null, mandatory: null, artistry: null, deductions: null, headPenalties: round6(headPenalties),
      final: round6(artMean == null ? null : artMean + headPenalties),
      tiebreak: round6(mean(art.map(s => Number(s.data?.values?.difficulty ?? 0)))),
      dsq,
    };
  }

  const technical = trimmedMean(totals('technical')) ?? 0;
  const mandatory = mean(totals('mandatory')) ?? 0; // one judge
  const artistry = trimmedMean(totals('artistry')) ?? 0;
  const deductions = mean(totals('deductions')) ?? 0;
  const headPenalties = mean(totals('head')) ?? 0;
  return {
    technical: round6(technical),
    mandatory: round6(mandatory),
    artistry: round6(artistry),
    deductions: round6(deductions),
    headPenalties: round6(headPenalties),
    final: round6(technical + mandatory + artistry + deductions + headPenalties),
    tiebreak: round6(technical),
    dsq,
  };
}

export function isDivergent(totals, panelMax, threshold = 0.2) {
  if (totals.length < 2 || !panelMax) return false;
  return (Math.max(...totals) - Math.min(...totals)) / panelMax > threshold + 1e-9;
}
