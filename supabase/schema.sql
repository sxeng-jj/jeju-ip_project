-- Supabase 대시보드 → SQL Editor 에 붙여 넣고 Run
-- 닉네임 + 축제 한 쌍당 스탬프 한 개 (같은 축제를 다시 찍으면 별점·후기가 갱신됨)
create table if not exists public.stamps (
  id            bigint generated always as identity primary key,
  nickname      text   not null,
  festival_id   text   not null,
  festival_title text  not null,
  rating        int    check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique (nickname, festival_id)
);

-- 로그인 없는 수업용 앱이라 anon 키로 읽기·쓰기를 모두 허용한다.
-- (실서비스라면 Supabase Auth 로 사용자별 정책을 걸어야 함)
alter table public.stamps enable row level security;

create policy "stamps_select" on public.stamps for select to anon using (true);
create policy "stamps_insert" on public.stamps for insert to anon with check (true);
create policy "stamps_update" on public.stamps for update to anon using (true) with check (true);
create policy "stamps_delete" on public.stamps for delete to anon using (true);
