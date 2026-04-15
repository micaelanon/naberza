import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Flag to track if Supabase is available
export const isSupabaseEnabled =
  !!supabaseUrl && !!supabaseKey && supabaseUrl !== "your_project_url_here";

// Create Supabase client (will be disabled if env vars are missing)
export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export type SupabaseClient = ReturnType<typeof createClient> | null;
