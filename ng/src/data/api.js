export function unwrap({ data, error }) {
  if (error) {
    const e = new Error(error.message || 'Database error');
    e.code = error.code ?? '';
    throw e;
  }
  return data;
}

export function makeApi(sb) {
  const q = async (promise) => unwrap(await promise);
  return {
    async email() {
      const { data } = await sb.auth.getSession();
      return data.session?.user?.email?.toLowerCase() ?? null;
    },
    person: (email) => q(sb.from('people').select('*').eq('email', email).maybeSingle()),
    people: () => q(sb.from('people').select('*').order('full_name').order('email')),
    mySeats: (email) => q(sb.from('panel_seats').select('*, categories(*, tournaments(*))').eq('email', email)),
    tournaments: () => q(sb.from('tournaments').select('*').order('starts_on', { ascending: false, nullsFirst: true })),
    allCategories: () => q(sb.from('categories').select('*, tournaments(*)').order('sort_order').order('name')),
    categories: (tournamentId) => q(sb.from('categories').select('*').eq('tournament_id', tournamentId).order('sort_order').order('name')),
    category: (id) => q(sb.from('categories').select('*, tournaments(*)').eq('id', id).single()),
    performances: (categoryId) => q(sb.from('performances').select('*').eq('category_id', categoryId).order('start_no')),
    seats: (categoryId) => q(sb.from('panel_seats').select('*').eq('category_id', categoryId).order('panel').order('seat_no')),
    sheetsForSeat: (seatId) => q(sb.from('score_sheets').select('*').eq('seat_id', seatId)),
    categorySheets: (categoryId) =>
      q(sb.from('score_sheets').select('*, performances!inner(category_id)').eq('performances.category_id', categoryId)),
    results: (categoryId) =>
      q(sb.from('performance_results').select('*, performances!inner(category_id)').eq('performances.category_id', categoryId)),
    saveSheet: (performanceId, seatId, data, submit = false) =>
      q(sb.rpc('save_sheet', { p_performance: performanceId, p_seat: seatId, p_data: data, p_submit: submit })),
    reopenSheet: (id) => q(sb.rpc('reopen_sheet', { p_sheet: id })),
    confirm: (performanceId) => q(sb.rpc('confirm_performance', { p_performance: performanceId })),
    unconfirm: (performanceId) => q(sb.rpc('unconfirm_performance', { p_performance: performanceId })),
    insert: (table, row) => q(sb.from(table).insert(row).select().single()),
    insertMany: (table, rows) => q(sb.from(table).insert(rows).select()),
    update: (table, id, patch, key = 'id') => q(sb.from(table).update(patch).eq(key, id).select().single()),
    remove: (table, id, key = 'id') => q(sb.from(table).delete().eq(key, id)),
    setMyName: (name) => q(sb.rpc('set_my_name', { p_name: name })),
    touch: () => q(sb.rpc('touch_activity')),
    sendFeedback: (message, page) => q(sb.rpc('send_feedback', { p_message: message, p_page: page })),
    activity: () => q(sb.rpc('activity_report')),
    feedback: () => q(sb.from('feedback').select('*').order('at', { ascending: false }).limit(200)),
    upsertPerson: (row) => q(sb.from('people').upsert(row).select().single()),
    subscribe(tables, onChange) {
      const channel = sb.channel(`ng-${Math.random().toString(36).slice(2)}`);
      for (const table of tables) channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
      channel.subscribe();
      return () => sb.removeChannel(channel);
    },
  };
}
