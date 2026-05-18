const SUPABASE_URL = "https://tdbfkahxzfjluymzocih.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_g-sBfLsO9h_WLzQ9LfX_Cw_DlnXxpNM";

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);