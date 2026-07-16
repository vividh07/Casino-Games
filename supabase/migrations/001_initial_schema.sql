-- LuckPocket: virtual in-game currency economy (no real money)
-- Run this in the Supabase SQL editor or via supabase db push

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  win_streak int not null default 0,
  best_streak int not null default 0,
  total_wagered numeric(18,2) not null default 0,
  total_won numeric(18,2) not null default 0,
  last_daily_bonus_at timestamptz,
  created_at timestamptz not null default now()
);

-- Wallets
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pocket_balance numeric(18,2) not null default 1500 check (pocket_balance >= 0),
  bank_balance numeric(18,2) not null default 0 check (bank_balance >= 0),
  last_interest_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Loans
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  principal numeric(18,2) not null check (principal >= 0 and principal <= 20000),
  original_principal numeric(18,2) not null check (original_principal > 0 and original_principal <= 20000),
  interest_rate numeric(8,4) not null default 0.10, -- 10% per day simple
  accrued_amount numeric(18,2) not null default 0,
  start_date timestamptz not null default now(),
  last_interest_date date not null default current_date,
  last_deduction_date timestamptz,
  next_deduction_at timestamptz not null default (now() + interval '7 days'),
  status text not null default 'active' check (status in ('active', 'paid')),
  created_at timestamptz not null default now()
);

create unique index if not exists loans_one_active_per_user
  on public.loans (user_id) where status = 'active';

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'deposit', 'withdraw', 'loan_disbursed', 'loan_repaid',
    'loan_auto_deduct', 'bank_interest', 'daily_bonus',
    'quest_reward', 'game_bet', 'game_payout', 'jackpot_win'
  )),
  amount numeric(18,2) not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_created_idx
  on public.transactions (user_id, created_at desc);

-- Game history
create table if not exists public.game_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_name text not null,
  bet_amount numeric(18,2) not null,
  outcome text not null, -- win | loss | push | jackpot
  payout numeric(18,2) not null default 0,
  multiplier numeric(12,4),
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_history_user_created_idx
  on public.game_history (user_id, created_at desc);
create index if not exists game_history_created_idx
  on public.game_history (created_at desc);

-- Quests
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_type text not null,
  title text not null,
  progress int not null default 0,
  target int not null,
  reward_amount numeric(18,2) not null,
  quest_date date not null default current_date,
  completed boolean not null default false,
  claimed boolean not null default false,
  unique (user_id, quest_type, quest_date)
);

-- Jackpot pool (single shared row)
create table if not exists public.jackpot_pool (
  id int primary key default 1 check (id = 1),
  pool_amount numeric(18,2) not null default 10000,
  seed_amount numeric(18,2) not null default 10000,
  last_winner_id uuid references auth.users(id),
  last_won_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.jackpot_pool (id, pool_amount) values (1, 10000)
  on conflict (id) do nothing;

-- Friends / referrals
create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_user_id),
  check (user_id <> friend_user_id)
);

-- User settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_loss_limit numeric(18,2), -- null = no limit
  sound_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  title text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

-- Daily loss tracker (computed helper table)
create table if not exists public.daily_loss (
  user_id uuid not null references auth.users(id) on delete cascade,
  loss_date date not null default current_date,
  net_loss numeric(18,2) not null default 0,
  primary key (user_id, loss_date)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.loans enable row level security;
alter table public.transactions enable row level security;
alter table public.game_history enable row level security;
alter table public.quests enable row level security;
alter table public.jackpot_pool enable row level security;
alter table public.friends enable row level security;
alter table public.user_settings enable row level security;
alter table public.achievements enable row level security;
alter table public.daily_loss enable row level security;

-- Policies: users read/write own rows; jackpot readable by all authenticated
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_select_public" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);

create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);

create policy "loans_select_own" on public.loans for select using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);

create policy "game_history_select_own" on public.game_history for select using (auth.uid() = user_id);
create policy "game_history_select_leaderboard" on public.game_history for select using (true);

create policy "quests_select_own" on public.quests for select using (auth.uid() = user_id);

create policy "jackpot_select_all" on public.jackpot_pool for select to authenticated using (true);

create policy "friends_select_own" on public.friends for select using (auth.uid() = user_id);
create policy "friends_insert_own" on public.friends for insert with check (auth.uid() = user_id);
create policy "friends_delete_own" on public.friends for delete using (auth.uid() = user_id);

create policy "settings_all_own" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "achievements_select_own" on public.achievements for select using (auth.uid() = user_id);

create policy "daily_loss_select_own" on public.daily_loss for select using (auth.uid() = user_id);

-- Bootstrap new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- ensure unique username
  if exists (select 1 from public.profiles where username = uname) then
    uname := uname || '_' || substr(new.id::text, 1, 6);
  end if;

  insert into public.profiles (user_id, username) values (new.id, uname);
  insert into public.wallets (user_id, pocket_balance, bank_balance) values (new.id, 1500, 0);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
