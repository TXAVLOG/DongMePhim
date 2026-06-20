import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://etcmgeeepeafmkinsrsw.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Y21nZWVlcGVhZm1raW5zcnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDQyODIsImV4cCI6MjA5NzUyMDI4Mn0.Wfp6UVbzFeFDF_Q3JSUhdQNt8Buu2T7Hp1S-lVNnh48';

const isServer = typeof window === 'undefined';
const extraHeaders: Record<string, string> = isServer ? { 'x-admin-token': 'tphimx-secure-admin-token-2026' } : {};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: extraHeaders
  }
});
