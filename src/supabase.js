import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qydyhwuirdplzzbmukut.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5ZHlod3VpcmRwbHp6Ym11a3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzgyMTAsImV4cCI6MjA5MjYxNDIxMH0.-eE_Cz-N-sepZuElv87LJ6EIOskpONLJKru1w7ctt8k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);