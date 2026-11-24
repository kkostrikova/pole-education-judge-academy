export const score = (key, label, max = 5, step = 0.5) => ({ key, label, type: 'score', max, step });
export const count = (key, label, points, only) => ({ key, label, type: 'count', points, ...(only ? { only } : {}) });
export const once = (key, label, points, only) => ({ key, label, type: 'once', points, ...(only ? { only } : {}) });
export const range = (key, label, min, step = 0.5, requiresComment = false) =>
  ({ key, label, type: 'range', min, step, ...(requiresComment ? { requiresComment: true } : {}) });
export const dsqOr = (key, label, points) => ({ key, label, type: 'dsq_or', points });

export const SCALE_HINT = '0 — відсутність критерію; 0,5–1,5 — погано; 2–3 — задовільно; 3,5–4,5 — добре; 5 — чудово';
