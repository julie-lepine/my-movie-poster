-- My Movies Poster — schéma Supabase
-- Exécuter dans : Supabase Dashboard → SQL Editor → New query → Run

-- Profils (liés à auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 2 and 32),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9._-]+$')
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- Créations sauvegardées (même structure JSON que le panier local)
create table if not exists public.creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists creations_user_created_idx on public.creations (user_id, created_at desc);

-- Trigger : profil à l'inscription (username dans raw_user_meta_data)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if v_username = '' then
    v_username := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (id, username, email)
  values (new.id, v_username, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at profil
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.creations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "creations_select_own" on public.creations;
create policy "creations_select_own"
  on public.creations for select
  using (auth.uid() = user_id);

drop policy if exists "creations_insert_own" on public.creations;
create policy "creations_insert_own"
  on public.creations for insert
  with check (auth.uid() = user_id);

drop policy if exists "creations_delete_own" on public.creations;
create policy "creations_delete_own"
  on public.creations for delete
  using (auth.uid() = user_id);
