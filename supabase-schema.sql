-- Supabase SQL Editor에서 실행하세요

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

create table if not exists game_saves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  character_type text not null,
  save_data jsonb not null default '{"stats":{"hunger":4,"happiness":4,"affinity":0,"age":0,"weight":10,"sick":false,"poop_count":0,"alive":true},"last_hunger_decay":0,"last_happiness_decay":0,"last_affinity_decay_hunger":null,"last_affinity_decay_happiness":null,"poop_timer":null,"created_at":null}',
  updated_at timestamptz default now(),
  unique(user_id, character_type)
);

-- 웹 푸시 구독 정보 (브라우저당 1개 — 여러 기기에서 구독 가능하도록 endpoint 기준 unique)
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  last_notified_at timestamptz,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table profiles enable row level security;
alter table game_saves enable row level security;
alter table push_subscriptions enable row level security;

-- 기존 정책 제거
drop policy if exists "own profile" on profiles;
drop policy if exists "own saves" on game_saves;
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "saves_select_own" on game_saves;
drop policy if exists "push_select_own" on push_subscriptions;

-- profiles: 자기 자신만 조회 가능, 쓰기 불가 (트리거가 처리)
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

-- game_saves: 조회는 자기 것만, 쓰기는 완전 차단
-- → anon/authenticated 키로 직접 curl해도 insert/update/delete 불가
-- → 오직 service role key (Next.js 서버)만 쓰기 가능
create policy "saves_select_own" on game_saves
  for select using (auth.uid() = user_id);

-- push_subscriptions: 조회는 자기 것만, 쓰기는 서버(service role)만 가능
create policy "push_select_own" on push_subscriptions
  for select using (auth.uid() = user_id);

-- 회원가입 시 자동 profiles 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
