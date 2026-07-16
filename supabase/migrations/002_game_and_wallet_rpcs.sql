-- Server-side wallet, bank, loan, and game outcome RPCs
-- All balance mutations happen here — never trust the client.

create or replace function public._streak_bonus(streak int)
returns numeric language sql immutable as $$
  select least(0.20, greatest(0, streak) * 0.02)::numeric;
$$;

create or replace function public._check_daily_loss_limit(p_user uuid, p_bet numeric)
returns void language plpgsql as $$
declare
  lim numeric;
  lost numeric;
begin
  select daily_loss_limit into lim from public.user_settings where user_id = p_user;
  if lim is null then return; end if;
  select coalesce(net_loss, 0) into lost
    from public.daily_loss where user_id = p_user and loss_date = current_date;
  if coalesce(lost, 0) + p_bet > lim then
    raise exception 'Daily loss limit reached';
  end if;
end;
$$;

create or replace function public._award_badge(p_user uuid, p_key text, p_title text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.achievements (user_id, badge_key, title)
  values (p_user, p_key, p_title)
  on conflict (user_id, badge_key) do nothing;
end;
$$;

create or replace function public._bump_quest(p_user uuid, p_type text, p_inc int default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.quests
  set progress = least(target, progress + p_inc),
      completed = (progress + p_inc) >= target
  where user_id = p_user
    and quest_date = current_date
    and quest_type = p_type
    and not completed;
end;
$$;

create or replace function public._feed_jackpot(p_bet numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  contrib numeric := round(p_bet * 0.01, 2);
begin
  update public.jackpot_pool
  set pool_amount = pool_amount + contrib, updated_at = now()
  where id = 1;
  return contrib;
end;
$$;

create or replace function public._try_jackpot(p_user uuid, p_bet numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  pool numeric;
  hit boolean;
begin
  hit := (random() < least(0.0025, 0.001 + (p_bet / 1000000.0)));
  if not hit then return 0; end if;

  select pool_amount into pool from public.jackpot_pool where id = 1 for update;
  update public.jackpot_pool
  set pool_amount = seed_amount,
      last_winner_id = p_user,
      last_won_at = now(),
      updated_at = now()
  where id = 1;

  update public.wallets set pocket_balance = pocket_balance + pool, updated_at = now()
  where user_id = p_user;

  insert into public.transactions (user_id, type, amount, meta)
  values (p_user, 'jackpot_win', pool, jsonb_build_object('note', 'progressive jackpot'));

  return pool;
end;
$$;

create or replace function public.transfer_funds(p_direction text, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  w public.wallets%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  if p_direction not in ('deposit', 'withdraw') then raise exception 'Invalid direction'; end if;

  select * into w from public.wallets where user_id = uid for update;
  if not found then raise exception 'Wallet not found'; end if;

  if p_direction = 'deposit' then
    if w.pocket_balance < p_amount then raise exception 'Insufficient pocket balance'; end if;
    update public.wallets
      set pocket_balance = pocket_balance - p_amount,
          bank_balance = bank_balance + p_amount,
          updated_at = now()
      where user_id = uid;
  else
    if w.bank_balance < p_amount then raise exception 'Insufficient bank balance'; end if;
    update public.wallets
      set bank_balance = bank_balance - p_amount,
          pocket_balance = pocket_balance + p_amount,
          updated_at = now()
      where user_id = uid;
  end if;

  insert into public.transactions (user_id, type, amount)
  values (uid, p_direction, p_amount);

  select * into w from public.wallets where user_id = uid;
  return jsonb_build_object('pocket', w.pocket_balance, 'bank', w.bank_balance);
end;
$$;

create or replace function public.take_loan(p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  loan_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 20000 then
    raise exception 'Loan must be between 1 and 20000';
  end if;
  if exists (select 1 from public.loans where user_id = uid and status = 'active') then
    raise exception 'You already have an active loan';
  end if;

  insert into public.loans (user_id, principal, original_principal, next_deduction_at)
  values (uid, p_amount, p_amount, now() + interval '7 days')
  returning id into loan_id;

  update public.wallets
    set bank_balance = bank_balance + p_amount, updated_at = now()
    where user_id = uid;

  insert into public.transactions (user_id, type, amount, meta)
  values (uid, 'loan_disbursed', p_amount, jsonb_build_object('loan_id', loan_id));

  return jsonb_build_object('loan_id', loan_id, 'principal', p_amount);
end;
$$;

create or replace function public.repay_loan(p_amount numeric, p_from text default 'pocket')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  l public.loans%rowtype;
  owed numeric;
  pay numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_from not in ('pocket', 'bank') then raise exception 'Invalid source'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

  select * into l from public.loans where user_id = uid and status = 'active' for update;
  if not found then raise exception 'No active loan'; end if;

  owed := l.principal + l.accrued_amount;
  pay := least(p_amount, owed);

  if p_from = 'pocket' then
    update public.wallets set pocket_balance = pocket_balance - pay, updated_at = now()
      where user_id = uid and pocket_balance >= pay;
    if not found then raise exception 'Insufficient pocket balance'; end if;
  else
    update public.wallets set bank_balance = bank_balance - pay, updated_at = now()
      where user_id = uid and bank_balance >= pay;
    if not found then raise exception 'Insufficient bank balance'; end if;
  end if;

  if pay <= l.accrued_amount then
    update public.loans set accrued_amount = accrued_amount - pay where id = l.id;
  else
    update public.loans
      set accrued_amount = 0,
          principal = principal - (pay - l.accrued_amount)
      where id = l.id;
  end if;

  select * into l from public.loans where id = l.id;
  if (l.principal + l.accrued_amount) <= 0.009 then
    update public.loans set principal = 0, accrued_amount = 0, status = 'paid' where id = l.id;
    perform public._award_badge(uid, 'paid_loan', 'Paid Off a Loan');
  end if;

  insert into public.transactions (user_id, type, amount, meta)
  values (uid, 'loan_repaid', pay, jsonb_build_object('from', p_from, 'loan_id', l.id));

  return jsonb_build_object(
    'paid', pay,
    'remaining', greatest(0, (select principal + accrued_amount from public.loans where id = l.id)),
    'status', (select status from public.loans where id = l.id)
  );
end;
$$;

create or replace function public.claim_daily_bonus()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  last_at timestamptz;
  bonus numeric := 100;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select last_daily_bonus_at into last_at from public.profiles where user_id = uid for update;
  if last_at is not null and last_at > now() - interval '24 hours' then
    raise exception 'Daily bonus already claimed';
  end if;

  update public.profiles set last_daily_bonus_at = now() where user_id = uid;
  update public.wallets set pocket_balance = pocket_balance + bonus, updated_at = now() where user_id = uid;
  insert into public.transactions (user_id, type, amount) values (uid, 'daily_bonus', bonus);

  return jsonb_build_object('bonus', bonus);
end;
$$;

create or replace function public.ensure_daily_quests()
returns setof public.quests
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  defs jsonb := '[
    {"type":"play_any","title":"Play 5 rounds of any game","target":5,"reward":75},
    {"type":"win_blackjack","title":"Win 3 hands of Blackjack","target":3,"reward":120},
    {"type":"spin_wheel","title":"Spin the wheel 5 times","target":5,"reward":90}
  ]'::jsonb;
  item jsonb;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  for item in select * from jsonb_array_elements(defs)
  loop
    insert into public.quests (user_id, quest_type, title, target, reward_amount, quest_date)
    values (
      uid,
      item->>'type',
      item->>'title',
      (item->>'target')::int,
      (item->>'reward')::numeric,
      current_date
    )
    on conflict (user_id, quest_type, quest_date) do nothing;
  end loop;
  return query select * from public.quests where user_id = uid and quest_date = current_date;
end;
$$;

create or replace function public.claim_quest_reward(p_quest_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q public.quests%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into q from public.quests where id = p_quest_id and user_id = uid for update;
  if not found then raise exception 'Quest not found'; end if;
  if not q.completed then raise exception 'Quest not completed'; end if;
  if q.claimed then raise exception 'Reward already claimed'; end if;

  update public.quests set claimed = true where id = q.id;
  update public.wallets set pocket_balance = pocket_balance + q.reward_amount, updated_at = now() where user_id = uid;
  insert into public.transactions (user_id, type, amount, meta)
  values (uid, 'quest_reward', q.reward_amount, jsonb_build_object('quest_id', q.id));

  return jsonb_build_object('reward', q.reward_amount);
end;
$$;

create or replace function public.update_settings(p_sound boolean, p_daily_loss_limit numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  insert into public.user_settings (user_id, sound_enabled, daily_loss_limit)
  values (uid, coalesce(p_sound, true), p_daily_loss_limit)
  on conflict (user_id) do update
    set sound_enabled = coalesce(p_sound, public.user_settings.sound_enabled),
        daily_loss_limit = p_daily_loss_limit;
  return jsonb_build_object('ok', true);
end;
$$;

-- Resolve individual games (called only from play_game)
create or replace function public._resolve_game(
  p_game text,
  p_bet numeric,
  p_action jsonb,
  p_streak_mult numeric,
  out outcome text,
  out payout numeric,
  out mult numeric,
  out details jsonb,
  out effective_bet numeric
)
language plpgsql as $$
declare
  player int; dealer int; doubled boolean; bet_eff numeric;
  ps int; hs int;
  r numeric; m numeric;
  symbols text[] := array['cherry','lemon','bell','bar','seven','diamond'];
  weights int[] := array[30,25,18,12,10,5];
  s1 text; s2 text; s3 text;
  roll int; i int; acc int; pick int; total_w int := 100;
  crash_at numeric; cashout numeric;
  slots numeric[] := array[5.0, 2.0, 1.1, 0.5, 0.3, 0.5, 1.1, 2.0, 5.0];
  pweights int[] := array[2, 5, 12, 18, 26, 18, 12, 5, 2];
  idx int := 1;
  side text; dcard int; tcard int; winner text;
begin
  outcome := 'loss';
  payout := 0;
  mult := 0;
  details := '{}'::jsonb;
  effective_bet := p_bet;

  if p_game = 'blackjack' then
    player := 12 + floor(random()*10)::int;
    dealer := 12 + floor(random()*10)::int;
    doubled := coalesce((p_action->>'double')::boolean, false);
    bet_eff := p_bet;
    -- double is handled in play_game (extra debit); here we just mark payout basis
    if doubled then bet_eff := p_bet; end if; -- caller passes full effective bet
    if random() < 0.08 and dealer < 21 then dealer := least(21, dealer + 1); end if;
    if player > 21 then
      outcome := 'loss'; payout := 0;
    elsif dealer > 21 or player > dealer then
      outcome := 'win'; payout := round(bet_eff * 2 * p_streak_mult, 2);
    elsif player = dealer then
      outcome := 'push'; payout := bet_eff;
    else
      outcome := 'loss'; payout := 0;
    end if;
    details := jsonb_build_object('player', player, 'dealer', dealer, 'doubled', doubled);
    if bet_eff > 0 then mult := payout / bet_eff; end if;
    effective_bet := bet_eff;

  elsif p_game = 'poker' then
    ps := floor(random()*100)::int;
    hs := floor(random()*100)::int;
    if ps > hs then
      outcome := 'win'; payout := round(p_bet * 2 * p_streak_mult, 2);
    elsif ps = hs then
      outcome := 'push'; payout := p_bet;
    else
      outcome := 'loss'; payout := 0;
    end if;
    if outcome = 'win' and random() < 0.03 then
      outcome := 'loss'; payout := 0;
    end if;
    details := jsonb_build_object('player_score', ps, 'house_score', hs);
    mult := case when p_bet > 0 then payout / p_bet else 0 end;

  elsif p_game = 'wheel' then
    r := random();
    if r < 0.30 then m := 0;
    elsif r < 0.55 then m := 1.2;
    elsif r < 0.75 then m := 1.5;
    elsif r < 0.88 then m := 2;
    elsif r < 0.95 then m := 3;
    elsif r < 0.985 then m := 5;
    else m := 10;
    end if;
    mult := m;
    payout := round(p_bet * m * (case when m > 0 then p_streak_mult else 1 end), 2);
    if payout > p_bet then outcome := 'win';
    elsif payout = p_bet then outcome := 'push';
    else outcome := 'loss';
    end if;
    details := jsonb_build_object('multiplier', m);

  elsif p_game = 'slots' then
    for pick in 1..3 loop
      roll := floor(random()*total_w)::int;
      acc := 0;
      for i in 1..6 loop
        acc := acc + weights[i];
        if roll < acc then
          if pick = 1 then s1 := symbols[i];
          elsif pick = 2 then s2 := symbols[i];
          else s3 := symbols[i];
          end if;
          exit;
        end if;
      end loop;
    end loop;
    if s1 = s2 and s2 = s3 then
      mult := case s1
        when 'diamond' then 25
        when 'seven' then 15
        when 'bar' then 8
        when 'bell' then 5
        when 'lemon' then 3
        else 2 end;
      payout := round(p_bet * mult * p_streak_mult, 2);
      outcome := 'win';
    elsif s1 = s2 or s2 = s3 or s1 = s3 then
      mult := 0.5;
      payout := round(p_bet * 0.5, 2);
      outcome := 'loss';
    else
      mult := 0; payout := 0; outcome := 'loss';
    end if;
    details := jsonb_build_object('reels', jsonb_build_array(s1, s2, s3));

  elsif p_game = 'crash' then
    if random() < 0.03 then
      crash_at := 1.00;
    else
      crash_at := least(100, greatest(1.01, round((0.97 / greatest(0.01, random()))::numeric, 2)));
    end if;
    cashout := coalesce((p_action->>'cashout')::numeric, 0);
    if cashout is null or cashout < 1.01 then
      cashout := round(least(crash_at + 0.5, greatest(1.01, crash_at * (0.7 + random()*0.5)))::numeric, 2);
    end if;
    if cashout < crash_at then
      mult := cashout;
      payout := round(p_bet * cashout * p_streak_mult, 2);
      outcome := 'win';
    else
      mult := 0; payout := 0; outcome := 'loss';
    end if;
    details := jsonb_build_object('crash_at', crash_at, 'cashout', cashout);

  elsif p_game = 'plinko' then
    roll := floor(random()*100)::int;
    acc := 0;
    for i in 1..9 loop
      acc := acc + pweights[i];
      if roll < acc then idx := i; exit; end if;
    end loop;
    m := slots[idx];
    mult := m;
    payout := round(p_bet * m * (case when m >= 1 then p_streak_mult else 1 end), 2);
    if payout > p_bet then outcome := 'win';
    elsif payout = p_bet then outcome := 'push';
    else outcome := 'loss';
    end if;
    details := jsonb_build_object('slot', idx - 1, 'multiplier', m);

  elsif p_game = 'dragon_tiger' then
    side := coalesce(p_action->>'side', 'dragon');
    dcard := 1 + floor(random()*13)::int;
    tcard := 1 + floor(random()*13)::int;
    if dcard > tcard then winner := 'dragon';
    elsif tcard > dcard then winner := 'tiger';
    else winner := 'tie';
    end if;

    if side = 'tie' then
      if winner = 'tie' then
        mult := 8; payout := round(p_bet * 9 * p_streak_mult, 2); outcome := 'win';
      else
        mult := 0; payout := 0; outcome := 'loss';
      end if;
    elsif side = winner then
      mult := 2;
      payout := round(p_bet * 2 * p_streak_mult, 2);
      outcome := 'win';
    elsif winner = 'tie' then
      outcome := 'push'; payout := p_bet; mult := 1;
    else
      outcome := 'loss'; payout := 0; mult := 0;
    end if;
    if outcome = 'win' and side <> 'tie' and random() < 0.01 then
      outcome := 'loss'; payout := 0; mult := 0;
    end if;
    details := jsonb_build_object('dragon', dcard, 'tiger', tcard, 'winner', winner, 'side', side);
  end if;
end;
$$;

create or replace function public.play_game(p_game text, p_bet numeric, p_action jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  w public.wallets%rowtype;
  p public.profiles%rowtype;
  streak_mult numeric;
  payout numeric := 0;
  outcome text := 'loss';
  details jsonb := '{}'::jsonb;
  jackpot numeric := 0;
  net numeric;
  mult numeric := 0;
  effective_bet numeric;
  doubled boolean;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_bet is null or p_bet < 10 then raise exception 'Minimum bet is 10'; end if;
  if p_game not in ('blackjack','poker','wheel','slots','crash','plinko','dragon_tiger') then
    raise exception 'Unknown game';
  end if;

  perform public._check_daily_loss_limit(uid, p_bet);

  select * into w from public.wallets where user_id = uid for update;
  if w.pocket_balance < p_bet then raise exception 'Insufficient pocket balance'; end if;

  select * into p from public.profiles where user_id = uid for update;
  streak_mult := 1 + public._streak_bonus(p.win_streak);

  effective_bet := p_bet;
  doubled := coalesce((p_action->>'double')::boolean, false) and p_game = 'blackjack';
  if doubled then
    if w.pocket_balance < p_bet * 2 then
      doubled := false;
      p_action := coalesce(p_action, '{}'::jsonb) || jsonb_build_object('double', false);
    else
      effective_bet := p_bet * 2;
    end if;
  end if;

  update public.wallets
    set pocket_balance = pocket_balance - effective_bet, updated_at = now()
    where user_id = uid;
  insert into public.transactions (user_id, type, amount, meta)
  values (uid, 'game_bet', effective_bet, jsonb_build_object('game', p_game));
  perform public._feed_jackpot(effective_bet);

  select r.outcome, r.payout, r.mult, r.details, r.effective_bet
    into outcome, payout, mult, details, effective_bet
  from public._resolve_game(p_game, effective_bet, p_action, streak_mult) as r;

  jackpot := public._try_jackpot(uid, effective_bet);
  if jackpot > 0 then
    outcome := 'jackpot';
    payout := payout + jackpot;
    details := details || jsonb_build_object('jackpot', jackpot);
  end if;

  if payout > 0 then
    update public.wallets set pocket_balance = pocket_balance + payout, updated_at = now() where user_id = uid;
    insert into public.transactions (user_id, type, amount, meta)
    values (uid, 'game_payout', payout, jsonb_build_object('game', p_game, 'outcome', outcome));
  end if;

  if outcome in ('win', 'jackpot') then
    update public.profiles
      set win_streak = win_streak + 1,
          best_streak = greatest(best_streak, win_streak + 1),
          total_wagered = total_wagered + effective_bet,
          total_won = total_won + payout
      where user_id = uid;
    if p_game = 'blackjack' then
      perform public._bump_quest(uid, 'win_blackjack', 1);
      perform public._award_badge(uid, 'first_bj_win', 'First Blackjack Win');
    end if;
  elsif outcome = 'push' then
    update public.profiles
      set total_wagered = total_wagered + effective_bet,
          total_won = total_won + payout
      where user_id = uid;
  else
    update public.profiles
      set win_streak = 0,
          total_wagered = total_wagered + effective_bet
      where user_id = uid;
  end if;

  perform public._bump_quest(uid, 'play_any', 1);
  if p_game = 'wheel' then perform public._bump_quest(uid, 'spin_wheel', 1); end if;

  net := effective_bet - payout;
  insert into public.daily_loss (user_id, loss_date, net_loss)
  values (uid, current_date, greatest(0, net))
  on conflict (user_id, loss_date)
  do update set net_loss = greatest(0, public.daily_loss.net_loss + excluded.net_loss);

  insert into public.game_history (user_id, game_name, bet_amount, outcome, payout, multiplier, details)
  values (uid, p_game, effective_bet, outcome, payout, mult, details);

  select * into w from public.wallets where user_id = uid;
  select * into p from public.profiles where user_id = uid;

  return jsonb_build_object(
    'outcome', outcome,
    'payout', payout,
    'multiplier', mult,
    'details', details,
    'jackpot', jackpot,
    'streak', p.win_streak,
    'streak_bonus', public._streak_bonus(p.win_streak),
    'pocket', w.pocket_balance,
    'bank', w.bank_balance
  );
end;
$$;

grant execute on function public.transfer_funds(text, numeric) to authenticated;
grant execute on function public.take_loan(numeric) to authenticated;
grant execute on function public.repay_loan(numeric, text) to authenticated;
grant execute on function public.claim_daily_bonus() to authenticated;
grant execute on function public.ensure_daily_quests() to authenticated;
grant execute on function public.claim_quest_reward(uuid) to authenticated;
grant execute on function public.update_settings(boolean, numeric) to authenticated;
grant execute on function public.play_game(text, numeric, jsonb) to authenticated;
