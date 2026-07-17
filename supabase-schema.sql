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
  save_data jsonb not null default '{"stats":{"hunger":4,"happiness":4,"age":0,"weight":10,"sick":false,"poop_count":0,"alive":true},"last_hunger_decay":0,"last_happiness_decay":0,"poop_timer":null,"last_day":0}',
  updated_at timestamptz default now(),
  unique(user_id, character_type)
);

-- RLS 활성화
alter table profiles enable row level security;
alter table game_saves enable row level security;

-- 기존 정책 제거
drop policy if exists "own profile" on profiles;
drop policy if exists "own saves" on game_saves;
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "saves_select_own" on game_saves;

-- profiles: 자기 자신만 조회 가능, 쓰기 불가 (트리거가 처리)
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

-- game_saves: 조회는 자기 것만, 쓰기는 완전 차단
-- → anon/authenticated 키로 직접 curl해도 insert/update/delete 불가
-- → 오직 service role key (Next.js 서버)만 쓰기 가능
create policy "saves_select_own" on game_saves
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
