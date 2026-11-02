-- 로그인(회원) 기능용 DB 변경. schema.sql 을 먼저 실행한 뒤, 이 파일을 SQL Editor 에서 Run 하세요.
-- 이후 스탬프는 "로그인한 본인 것만" 만들고 고치고 지울 수 있습니다. (읽기는 후기 공개 때문에 모두 가능)
--
-- ⚠ 이 SQL 을 실행하면 로그인 없는 옛 버전 앱은 스탬프를 저장할 수 없게 됩니다.
--    새 코드를 배포(또는 로컬 실행)한 뒤에 실행하세요.

-- 1) 스탬프에 주인(user_id) 붙이기
alter table public.stamps
  add column if not exists user_id uuid references auth.users (id) on delete cascade default auth.uid();

-- 2) 같은 닉네임을 쓰는 서로 다른 회원이 충돌하지 않도록, 닉네임 기준 유일 제약을 계정 기준으로 바꾼다
alter table public.stamps drop constraint if exists stamps_nickname_festival_id_key;
create unique index if not exists stamps_user_festival_key on public.stamps (user_id, festival_id);

-- 3) 정책: 쓰기는 로그인한 본인 행만
drop policy if exists "stamps_select" on public.stamps;
drop policy if exists "stamps_insert" on public.stamps;
drop policy if exists "stamps_update" on public.stamps;
drop policy if exists "stamps_delete" on public.stamps;

-- 읽기: 누구나 (축제별 후기를 공개하기 위해). 로그인한 사용자는 anon 이 아니라 authenticated 역할이라 둘 다 적는다.
create policy "stamps_select" on public.stamps for select to anon, authenticated using (true);
create policy "stamps_insert" on public.stamps for insert to authenticated with check (user_id = auth.uid());
create policy "stamps_update" on public.stamps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "stamps_delete" on public.stamps for delete to authenticated using (user_id = auth.uid());

-- (선택) 로그인 도입 전에 닉네임으로 저장된 옛 스탬프는 주인이 없어(user_id 가 비어 있음) 더는 수정·삭제할 수 없습니다.
-- 정리하고 싶다면 아래 줄의 주석을 풀고 실행하세요.
-- delete from public.stamps where user_id is null;
