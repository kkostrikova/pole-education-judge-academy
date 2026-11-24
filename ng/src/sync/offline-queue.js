/**
 * Local-first save queue. The newest version of every sheet is kept until the
 * server accepts it, so a lost connection or a reload never loses scores.
 * The in-memory copy is the source of truth; storage is a mirror for reloads.
 */

// Postgres SQLSTATE classes that mean "try again later", not "the data is wrong".
const RETRYABLE_CLASSES = new Set(['08', '40', '53', '57', '58']);

/** True only when the server rejected the data (a Postgres SQLSTATE that is not a transient class). */
export function isRejection(e) {
  const code = e?.code;
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) && !RETRYABLE_CLASSES.has(code.slice(0, 2));
}

export function createSaveQueue({ storage, send, onStatus = () => {}, key = 'ng-save-queue' }) {
  const load = () => {
    try {
      const parsed = JSON.parse(storage.getItem(key) ?? '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  };
  let queue = load();
  const persist = () => {
    try { storage.setItem(key, JSON.stringify(queue)); } catch { /* storage blocked or full: memory copy still sends */ }
  };
  const dropIfUnchanged = (id, item) => {
    if (JSON.stringify(queue[id]) === JSON.stringify(item)) { delete queue[id]; persist(); }
  };
  let running = null;

  function stage(item) {
    queue[item.id] = { ...item, submit: Boolean(item.submit || queue[item.id]?.submit) };
    persist();
    onStatus(item.id, 'pending');
  }

  async function sendAll() {
    for (let round = 0; round < 20; round++) {
      const ids = Object.keys(queue);
      if (!ids.length) return true;
      for (const id of ids) {
        const item = queue[id];
        try {
          const res = await send(item);
          dropIfUnchanged(id, item);
          onStatus(id, item.submit ? 'submitted' : 'saved', res);
        } catch (e) {
          if (!isRejection(e)) { onStatus(id, 'offline', e); return false; }
          dropIfUnchanged(id, item);
          onStatus(id, 'rejected', e);
        }
      }
    }
    return Object.keys(queue).length === 0;
  }

  function flush() {
    if (!running) running = sendAll().finally(() => { running = null; });
    return running;
  }

  return {
    stage,
    enqueue(item) { stage(item); return flush(); },
    flush,
    pending: (id) => queue[id] ?? null,
    size: () => Object.keys(queue).length,
  };
}
