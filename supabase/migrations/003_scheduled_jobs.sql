-- Daily loan interest + weekly auto-deduction + weekly bank interest
-- Requires pg_cron (Supabase Pro) OR invoke via Edge Function cron.

create or replace function public.run_daily_loan_interest()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  daily_interest numeric;
  ceiling numeric;
  new_accrued numeric;
  deduct numeric;
  bank_bal numeric;
  owed numeric;
begin
  for l in select * from public.loans where status = 'active'
  loop
    -- Flat 10%/day simple interest on original principal; stop at 2x original
    ceiling := l.original_principal * 2;
    owed := l.principal + l.accrued_amount;

    if l.last_interest_date < current_date then
      if owed >= ceiling then
        daily_interest := 0;
        new_accrued := l.accrued_amount;
      else
        daily_interest := round(l.original_principal * 0.10, 2);
        new_accrued := least(ceiling - l.principal, l.accrued_amount + daily_interest);
      end if;

      update public.loans
        set accrued_amount = new_accrued,
            last_interest_date = current_date
        where id = l.id;
    end if;

    -- Auto-deduct 50% of Bank every 7 days while loan outstanding
    if l.next_deduction_at <= now() then
      select bank_balance into bank_bal from public.wallets where user_id = l.user_id for update;
      select principal + accrued_amount into owed from public.loans where id = l.id;
      deduct := least(round(coalesce(bank_bal, 0) * 0.50, 2), owed);

      if deduct > 0 then
        update public.wallets
          set bank_balance = bank_balance - deduct, updated_at = now()
          where user_id = l.user_id;

        select * into l from public.loans where id = l.id;
        if deduct <= l.accrued_amount then
          update public.loans set accrued_amount = accrued_amount - deduct where id = l.id;
        else
          update public.loans
            set accrued_amount = 0,
                principal = greatest(0, principal - (deduct - l.accrued_amount))
            where id = l.id;
        end if;

        insert into public.transactions (user_id, type, amount, meta)
        values (l.user_id, 'loan_auto_deduct', deduct, jsonb_build_object('loan_id', l.id));
      end if;

      update public.loans
        set last_deduction_date = now(),
            next_deduction_at = now() + interval '7 days'
        where id = l.id;

      update public.loans
        set status = 'paid', principal = 0, accrued_amount = 0
        where id = l.id and principal + accrued_amount <= 0.009;
    end if;
  end loop;
end;
$$;

create or replace function public.run_weekly_bank_interest()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  interest numeric;
begin
  for w in
    select * from public.wallets
    where bank_balance > 0
      and last_interest_at <= now() - interval '7 days'
  loop
    interest := round(w.bank_balance * 0.05, 2);
    if interest <= 0 then continue; end if;

    update public.wallets
      set bank_balance = bank_balance + interest,
          last_interest_at = now(),
          updated_at = now()
      where user_id = w.user_id;

    insert into public.transactions (user_id, type, amount, meta)
    values (w.user_id, 'bank_interest', interest, jsonb_build_object('rate', 0.05));
  end loop;
end;
$$;

-- Optional pg_cron (uncomment if available):
-- select cron.schedule('daily-loan-interest', '0 0 * * *', $$select public.run_daily_loan_interest()$$);
-- select cron.schedule('weekly-bank-interest', '0 0 * * 1', $$select public.run_weekly_bank_interest()$$);
