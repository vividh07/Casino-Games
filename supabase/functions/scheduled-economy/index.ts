// Supabase Edge Function: invoke on a cron schedule (daily)
// Runs loan interest / auto-deduction and weekly bank interest credit.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error: loanErr } = await supabase.rpc('run_daily_loan_interest')
  const { error: bankErr } = await supabase.rpc('run_weekly_bank_interest')

  return new Response(
    JSON.stringify({
      ok: !loanErr && !bankErr,
      loanErr: loanErr?.message ?? null,
      bankErr: bankErr?.message ?? null,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
