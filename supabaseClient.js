import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase ayarları eksik. .env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY eklediğinden emin ol."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
