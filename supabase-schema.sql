-- Supabase SQL Editor에서 실행하세요

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  -- 알림을 받고 싶지 않은 캐릭터 목록(character_type) — 계정 전체 알림은 켠 채로
  -- 특정 멤버만 뮤트할 수 있게
  muted_characters text[] not null default '{}',
  created_at timestamptz default now()
);

-- 이미 배포된 DB에도 반영 (기존 테이블에는 create table if not exists가 안 먹으므로)
alter table profiles add column if not exists muted_characters text[] not null default '{}';

create table if not exists game_saves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  character_type text not null,
  save_data jsonb not null default '{"stats":{"hunger":4,"happiness":4,"affinity":0,"age":0,"weight":10,"sick":false,"poop_count":0,"alive":true},"last_hunger_decay":0,"last_happiness_decay":0,"last_affinity_decay_hunger":null,"last_affinity_decay_happiness":null,"hunger_decay_accum":0,"happiness_decay_accum":0,"poop_timers":[],"created_at":null}',
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

-- 오류 제보 / 문의사항 — 작성자 본인과 관리자(서버의 service role)만 확인 가능,
-- 다른 유저에게는 공개되지 않는 비공개 문의
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  username text not null,
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz default now()
);

-- 공지사항 / QnA — 관리자가 작성, 모든 로그인 유저에게 공개(모달로 표시)
-- title/content는 한국어(필수), title_en/content_en은 영어(선택 — 비워두면 모달에서 한국어로 대체 표시)
create table if not exists announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  title_en text,
  content_en text,
  created_at timestamptz default now()
);

-- 이미 배포된 DB에도 반영
alter table announcements add column if not exists title_en text;
alter table announcements add column if not exists content_en text;

-- RLS 활성화
alter table profiles enable row level security;
alter table game_saves enable row level security;
alter table push_subscriptions enable row level security;
alter table feedback enable row level security;
alter table announcements enable row level security;

-- 기존 정책 제거
drop policy if exists "own profile" on profiles;
drop policy if exists "own saves" on game_saves;
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "saves_select_own" on game_saves;
drop policy if exists "push_select_own" on push_subscriptions;
drop policy if exists "feedback_select_own" on feedback;
drop policy if exists "announcements_select_all" on announcements;

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

-- feedback: 조회는 자기 것만 (관리자는 서버 API에서 service role로 전체 조회), 쓰기는 서버(service role)만 가능
create policy "feedback_select_own" on feedback
  for select using (auth.uid() = user_id);

-- announcements: 전체 공개 조회(공지라서 다들 봐야 함), 쓰기는 서버(service role, 관리자만)만 가능
create policy "announcements_select_all" on announcements
  for select using (true);

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
