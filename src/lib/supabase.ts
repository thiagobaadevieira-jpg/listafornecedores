import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vguvwtqobrhhexenpvpb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndXZ3dHFvYnJoaGV4ZW5wdnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDc1MDgsImV4cCI6MjA5NTIyMzUwOH0.gn6B7CA4Haf3WFHm03DO6QNOqZn5ViVyz6BE-EwE8MU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
