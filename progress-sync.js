(() => {
  const cfg = window.PE_CONFIG || {};
  const LOCAL_KEY = 'pe_judge_progress_v1';
  let client = null;
  try {
    if (window.supabase && cfg.supabaseUrl && cfg.supabasePublishableKey) {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
    }
  } catch (_) {}

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function writeLocal(state) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('pe-progress-updated', { detail: state }));
  }

  async function saveRemote(moduleId, score, passed) {
    if (!client) return { saved:false, reason:'no-client' };
    const { data:{ session } } = await client.auth.getSession();
    if (!session) return { saved:false, reason:'not-signed-in' };

    const uid = session.user.id;
    const { data: last, error: readError } = await client
      .from('module_results')
      .select('attempt')
      .eq('user_id', uid)
      .eq('module_id', moduleId)
      .order('attempt', { ascending:false })
      .limit(1);

    if (readError) return { saved:false, reason:readError.message };
    const attempt = (last && last[0] ? Number(last[0].attempt) : 0) + 1;

    const { error } = await client.from('module_results').insert({
      user_id: uid,
      module_id: moduleId,
      score: Number(score),
      passed: Boolean(passed),
      attempt
    });
    if (error) return { saved:false, reason:error.message };
    return { saved:true, attempt };
  }

  window.PE_flushLocalProgress = async function() {
    if (!client) return { saved:0, reason:'no-client' };
    const { data:{ session } } = await client.auth.getSession();
    if (!session) return { saved:0, reason:'not-signed-in' };

    const local = readLocal();
    let saved = 0;
    for (const [moduleId, rec] of Object.entries(local)) {
      if (!rec || typeof rec !== 'object') continue;
      const id = Number(moduleId);
      if (!Number.isInteger(id) || id < 1 || id > 8) continue;

      const { data: existing, error: readError } = await client
        .from('module_results')
        .select('id,score,passed,attempt')
        .eq('user_id', session.user.id)
        .eq('module_id', id)
        .order('attempt', { ascending:false })
        .limit(1);

      if (readError) continue;

      const last = existing && existing[0];
      const localScore = Math.max(0, Math.min(100, Math.round(Number(rec.score) || 0)));
      const localPassed = Boolean(rec.passed);

      if (last && Number(last.score) >= localScore && Boolean(last.passed) >= localPassed) continue;

      const attempt = last ? Number(last.attempt || 0) + 1 : 1;
      const { error } = await client.from('module_results').insert({
        user_id: session.user.id,
        module_id: id,
        score: localScore,
        passed: localPassed,
        attempt
      });
      if (!error) saved++;
    }
    return { saved };
  };

  window.PE_saveModuleResult = async function(moduleId, score, passed) {
    const id = Number(moduleId);
    const pct = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    const state = readLocal();
    const prev = state[id] || {};
    state[id] = {
      passed: Boolean(prev.passed) || Boolean(passed),
      score: Math.max(Number(prev.score) || 0, pct)
    };
    writeLocal(state);

    try {
      const remote = await saveRemote(id, pct, passed);
      window.dispatchEvent(new CustomEvent('pe-result-synced', { detail:{ moduleId:id, score:pct, passed:Boolean(passed), ...remote } }));
      return remote;
    } catch (e) {
      return { saved:false, reason:e?.message || 'sync-error' };
    }
  };

  async function hydrateFromRemote() {
    if (!client) return;
    const { data:{ session } } = await client.auth.getSession();
    if (!session) return;
    const { data, error } = await client
      .from('module_results')
      .select('module_id,score,passed,attempt')
      .eq('user_id', session.user.id);
    if (error || !data) return;

    const state = readLocal();
    data.forEach(r => {
      const id = Number(r.module_id);
      const prev = state[id] || {};
      state[id] = {
        passed: Boolean(prev.passed) || Boolean(r.passed),
        score: Math.max(Number(prev.score) || 0, Number(r.score) || 0)
      };
    });
    writeLocal(state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateFromRemote, { once:true });
  } else {
    hydrateFromRemote();
  }
})();