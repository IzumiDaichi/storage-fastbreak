// ─────────────────────────────────────────────────────────────
// supabase.js — Supabase client, credentials from .env.local
// ─────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js')

// Read values passed from main.js via additionalArguments
function getArg(name) {
  const arg = process.argv.find(a => a.startsWith('--' + name + '='))
  return arg ? arg.split('=').slice(1).join('=') : ''
}

const SUPABASE_URL = getArg('SUPABASE_URL')
const SUPABASE_KEY = getArg('SUPABASE_ANON_KEY')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Make sure .env.local exists in the project root.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)