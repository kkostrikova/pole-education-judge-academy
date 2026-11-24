import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

if (SUPABASE_URL.includes('YOUR-PROJECT')) {
  document.body.innerHTML = '<p style="padding:24px">Платформу ще не підключено до бази: заповніть src/config.js.</p>';
  throw new Error('Supabase is not configured');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
