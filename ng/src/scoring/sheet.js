import { protocolItems } from '../protocols/index.js';

const EPS = 1e-9;
const MAX_COUNT = 50;
const onStep = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-6;
const round6 = (x) => Math.round(x * 1e6) / 1e6;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function itemError(item, v) {
  switch (item.type) {
    case 'score':
      return isNum(v) && v >= 0 && v <= item.max + EPS && onStep(v, item.step)
        ? null : `${item.label}: бал має бути від 0 до ${item.max} з кроком ${item.step}`;
    case 'range':
      return isNum(v) && v <= 0 && v >= item.min - EPS && onStep(v, item.step)
        ? null : `${item.label}: значення від ${item.min} до 0 з кроком ${item.step}`;
    case 'count':
      return Number.isInteger(v) && v >= 0 && v <= MAX_COUNT ? null : `${item.label}: кількість від 0 до ${MAX_COUNT}`;
    case 'once':
      return typeof v === 'boolean' ? null : `${item.label}: має бути так або ні`;
    case 'dsq_or':
      return ['none', 'penalty', 'dsq'].includes(v) ? null : `${item.label}: оберіть «ні», «штраф» або «DSQ»`;
    default:
      return `${item.label}: невідомий тип ${item.type}`;
  }
}

export function valueErrors(protocol, data, ctx = {}) {
  const errors = [];
  const items = new Map(protocolItems(protocol, ctx.apparatus).map(i => [i.key, i]));
  for (const [key, v] of Object.entries(data?.values ?? {})) {
    const item = items.get(key);
    if (!item) { errors.push(`${key}: невідомий критерій`); continue; }
    const e = itemError(item, v);
    if (e) errors.push(e);
  }
  return errors;
}

export function submitErrors(protocol, data, ctx = {}) {
  const errors = valueErrors(protocol, data, ctx);
  const values = data?.values ?? {};
  for (const item of protocolItems(protocol, ctx.apparatus)) {
    if (item.type === 'score' && values[item.key] === undefined) errors.push(`${item.label}: не виставлено бал`);
    if (item.type === 'once' && item.choice && values[item.key] === undefined) errors.push(`${item.label}: оберіть «зараховано» або «не зараховано»`);
    if (item.requiresComment && Number(values[item.key] ?? 0) !== 0 && !(data?.comments?.[item.key] ?? '').trim()) {
      errors.push(`${item.label}: потрібен коментар`);
    }
  }
  return errors;
}

export function sheetTotal(protocol, data, ctx = {}) {
  const errors = valueErrors(protocol, data, ctx);
  if (errors.length) throw new Error(errors.join('; '));
  const values = data?.values ?? {};
  let total = 0;
  let dsq = false;
  for (const item of protocolItems(protocol, ctx.apparatus)) {
    const v = values[item.key];
    if (v === undefined) continue;
    if (item.type === 'score' || item.type === 'range') total += v;
    else if (item.type === 'count') total += item.points * v;
    else if (item.type === 'once') { if (v) total += item.points; }
    else if (item.type === 'dsq_or') {
      if (v === 'penalty') total += item.points;
      else if (v === 'dsq') dsq = true;
    }
  }
  return { total: round6(total) + 0, dsq };
}

export function protocolMax(protocol, ctx = {}) {
  return protocolItems(protocol, ctx.apparatus).reduce(
    (s, i) => s + (i.type === 'score' ? i.max : i.type === 'once' && i.choice ? i.points : 0), 0);
}
