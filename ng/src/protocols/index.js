import { techPole, techHoop, techSilks } from './sport-technical.js';
import { artistry } from './sport-artistry.js';
import { deductions } from './sport-deductions.js';
import { head } from './head.js';
import { art } from './art.js';

export const PROTOCOLS = {
  tech_pole: techPole,
  tech_hoop: techHoop,
  tech_silks: techSilks,
  artistry,
  deductions,
  head,
  art,
};

export const PANELS_BY_KIND = {
  sport: ['technical', 'artistry', 'deductions', 'head'],
  art: ['art', 'head'],
};

export const PANEL_LABELS = {
  technical: 'Технічна складність',
  artistry: 'Артистизм',
  deductions: 'Збавки',
  art: 'Арт',
  head: 'Head Judge',
};

export const APPARATUS_LABELS = { pole: 'Pole sport', hoop: 'Aerial hoop', silks: 'Aerial silk' };
export const ENTRY_TYPE_LABELS = { solo: 'Соло', duet: 'Дует', group: 'Група' };
export const KIND_LABELS = { sport: 'Спорт', art: 'Арт' };

export function getProtocol(key) {
  const p = PROTOCOLS[key];
  if (!p) throw new Error(`Unknown protocol: ${key}`);
  return p;
}

export function protocolKeyFor(panel, apparatus) {
  switch (panel) {
    case 'technical': return `tech_${apparatus}`;
    case 'artistry':
    case 'deductions':
    case 'head':
    case 'art':
      return panel;
    default:
      throw new Error(`Unknown panel: ${panel}`);
  }
}

export function protocolItems(protocol, apparatus) {
  return protocol.sections
    .flatMap(s => s.items)
    .filter(i => !apparatus || !i.only || i.only.includes(apparatus));
}

export function seatHasProtocol(kind, panel) {
  return !(kind === 'art' && panel === 'head');
}
