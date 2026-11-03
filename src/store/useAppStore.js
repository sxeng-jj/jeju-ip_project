import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translateAuthError } from '../lib/authErrors'
import { supabase } from '../lib/supabase'
import { fetchFestivals } from '../api/client'
import { buildCollection } from '../lib/badges'

const NO_DB = 'Supabase 설정(.env.local)이 필요해요'
const NEED_LOGIN = '스탬프는 로그인 후에 찍을 수 있어요'

// 닉네임: 가입할 때 적은 이름, 없으면 이메일 앞부분
const displayName = (user) => (user ? user.user_metadata?.nickname || user.email?.split('@')[0] || '회원' : '')

// 여러 페이지가 함께 쓰는 상태. 사용법: const user = useAppStore((s) => s.user)
export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── 로그인(Supabase Auth) ──
      user: null, // 로그인한 회원 (없으면 null)
      nickname: '', // user 에서 뽑은 표시 이름. 로그인하지 않으면 빈 문자열
      authReady: false, // 저장된 로그인 상태를 확인했는가 (확인 전에는 '로그아웃 상태'로 단정하지 않는다)

      // 앱이 켜질 때 한 번 호출: 저장된 세션을 읽고, 로그인·로그아웃이 일어날 때마다 상태를 맞춘다. 반환값은 구독 해제 함수.
      initAuth: () => {
        if (!supabase) { set({ authReady: true }); return () => {} }
        const apply = (session) => {
          const user = session?.user ?? null
          set({ user, nickname: displayName(user), authReady: true, ...(user ? {} : { stamps: [] }) })
        }
        supabase.auth.getSession().then(({ data }) => apply(data.session))
        const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session))
        return () => data.subscription.unsubscribe()
      },

      // 회원가입. 이메일 확인이 켜져 있으면 세션이 오지 않으므로 needsConfirm 으로 알려 준다.
      signUp: async ({ email, password, nickname }) => {
        if (!supabase) return { ok: false, error: NO_DB }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname }, emailRedirectTo: `${window.location.origin}/login` },
        })
        if (error) return { ok: false, error: translateAuthError(error) }
        // 이미 가입된 이메일이면 오류 대신 identities 가 빈 사용자가 돌아온다 (계정 존재 여부를 숨기려는 Supabase 동작)
        if (data.user && data.user.identities?.length === 0) return { ok: false, error: translateAuthError({ code: 'user_already_exists' }) }
        return { ok: true, needsConfirm: !data.session }
      },

      signIn: async ({ email, password }) => {
        if (!supabase) return { ok: false, error: NO_DB }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error ? { ok: false, error: translateAuthError(error) } : { ok: true }
      },

      signOut: async () => {
        if (!supabase) return
        await supabase.auth.signOut()
        get().toast('로그아웃했어요', 'secondary')
      },

      // 알림(토스트): get().toast('메시지')
      toasts: [],
      toast: (message, variant = 'success') => {
        const id = Date.now() + Math.random()
        set({ toasts: [...get().toasts, { id, message, variant }] })
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
      },

      // 스탬프 — Supabase stamps 테이블과 동기화 (로그인한 본인의 행만 쓸 수 있다: supabase/auth.sql)
      stamps: [],
      stampsLoading: false,

      loadStamps: async () => {
        const { user, toast } = get()
        if (!supabase || !user) return set({ stamps: [] })
        set({ stampsLoading: true })
        const { data, error } = await supabase
          .from('stamps').select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        set({ stampsLoading: false })
        if (error) return toast(error.message, 'danger')
        set({ stamps: data })
      },

      // 같은 축제를 다시 찍으면 별점·후기만 갱신 (user_id + festival_id 가 유일)
      saveStamp: async (festival, { rating, comment }) => {
        const { user, nickname, toast } = get()
        if (!supabase) return toast(NO_DB, 'warning')
        if (!user) return toast(NEED_LOGIN, 'warning')
        const row = {
          user_id: user.id,
          nickname, // 후기에 보여줄 이름 (그때그때의 닉네임을 복사해 둔다)
          festival_id: String(festival.id),
          festival_title: festival.title,
          rating: rating || null,
          comment: comment?.trim() || null,
        }
        const { data, error } = await supabase
          .from('stamps').upsert(row, { onConflict: 'user_id,festival_id' }).select().single()
        if (error) return toast(error.message, 'danger')
        const before = get().stamps
        set({ stamps: [data, ...before.filter((s) => s.id !== data.id)] })
        toast('스탬프를 찍었어요!')
        get().loadReviews()
        get().checkNewBadges(before)
        return data
      },

      // 새로 얻은 배지 (큰 알림창에 하나씩 보여 준다)
      unlocked: [],
      dismissUnlocked: () => set({ unlocked: get().unlocked.slice(1) }),
      // 스탬프를 찍기 전과 후의 배지를 비교해, 이번에 새로 ok 가 된 것만 알림창 대기열에 넣는다
      checkNewBadges: async (beforeStamps) => {
        try {
          const list = await fetchFestivals()
          const had = new Set(buildCollection(beforeStamps, list).badges.filter((b) => b.ok).map((b) => b.key))
          const fresh = buildCollection(get().stamps, list).badges.filter((b) => b.ok && !had.has(b.key))
          if (fresh.length) set({ unlocked: [...get().unlocked, ...fresh] })
        } catch { /* 목록을 못 받으면 알림만 건너뛴다 */ }
      },

      // 모두의 후기 — 축제별 평균 별점·후기 목록 (stamps 테이블에서 별점이나 후기가 있는 행)
      // 주의: 현장 인증을 거친 후기가 아니라 스탬프를 찍은 사람이 남긴 후기다.
      reviews: {}, // { [festival_id]: { count, avg, items: [{nickname, rating, comment, created_at}] } }
      loadReviews: async () => {
        if (!supabase) return
        const { data, error } = await supabase
          .from('stamps').select('festival_id,nickname,rating,comment,created_at')
          .or('rating.not.is.null,comment.not.is.null')
          .order('created_at', { ascending: false })
          .limit(1000)
        if (error) return
        const map = {}
        for (const r of data) {
          const m = (map[r.festival_id] ??= { count: 0, sum: 0, rated: 0, items: [] })
          m.count++
          if (r.rating) { m.sum += r.rating; m.rated++ }
          m.items.push(r)
        }
        for (const m of Object.values(map)) { m.avg = m.rated ? m.sum / m.rated : null; delete m.sum }
        set({ reviews: map })
      },

      // 내 일정 — 담아 둔 축제 id (지도에서 동선과 이동 거리를 비교한다). 이 브라우저에만 저장된다.
      plan: [],
      togglePlan: (id) => {
        const plan = get().plan
        set({ plan: plan.includes(id) ? plan.filter((x) => x !== id) : [...plan, id] })
      },
      // 여러 곳을 한꺼번에 담는다 (AI 일정 결과). 이미 담은 곳은 그대로 두고 새로 담은 것만 뒤에 붙인다.
      addToPlan: (ids) => set({ plan: [...get().plan, ...ids.filter((id) => !get().plan.includes(id))] }),
      clearPlan: () => set({ plan: [] }),

      removeStamp: async (id) => {
        const { toast } = get()
        if (!supabase) return toast(NO_DB, 'warning')
        const { error } = await supabase.from('stamps').delete().eq('id', id)
        if (error) return toast(error.message, 'danger')
        set({ stamps: get().stamps.filter((s) => s.id !== id) })
        toast('스탬프를 지웠어요', 'secondary')
        get().loadReviews()
      },
    }),
    {
      name: 'jeju-festa-store',
      partialize: (s) => ({ plan: s.plan }),
      // 예전 버전이 저장해 둔 닉네임이 로그인 상태를 덮어쓰지 않도록, 저장값에서는 plan 만 가져온다
      merge: (persisted, current) => ({ ...current, plan: persisted?.plan ?? current.plan }),
    },
  ),
)
