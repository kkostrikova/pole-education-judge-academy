/* Pole Education — who is looking at this page.

   The course runs strictly in order for students: module 2 opens once
   module 1 is passed, the final exam once all eight are, the practical once
   the theory is. The author still has to be able to walk into any module to
   check it, which is what config.reviewMode used to do — but it did it for
   everyone at once, so turning the gates on meant locking herself out too.

   This resolves the signed-in user's role once and answers one question:
   should the gates be lifted for this person. Admins yes, and reviewMode
   still lifts them for everybody when it is deliberately switched on. */
(() => {
  const cfg = window.PE_CONFIG || {};

  window.PE_ROLE = null;
  window.PE_IS_ADMIN = false;
  window.PE_ROLE_READY = false;
  /* reviewMode first, so the answer holds even before the role lands */
  window.PE_openAll = () => Boolean((window.PE_CONFIG || {}).reviewMode) || window.PE_IS_ADMIN === true;

  function done() {
    window.PE_ROLE_READY = true;
    window.dispatchEvent(new CustomEvent('pe-role-ready', {
      detail: { role: window.PE_ROLE, isAdmin: window.PE_IS_ADMIN }
    }));
  }

  if (!window.supabase || !cfg.supabaseUrl || !cfg.supabasePublishableKey) { done(); return; }

  let client;
  try { client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey); }
  catch (_) { done(); return; }

  client.auth.getSession()
    .then(({ data }) => {
      if (!data?.session) return null;
      return client.from('profiles').select('role')
        .eq('user_id', data.session.user.id).maybeSingle();
    })
    .then(res => {
      const role = res && res.data ? res.data.role : null;
      window.PE_ROLE = role || null;
      window.PE_IS_ADMIN = role === 'admin';
    })
    .catch(() => {})
    .finally(done);
})();
