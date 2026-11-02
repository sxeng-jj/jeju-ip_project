import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const NO_DB = 'Supabase 설정(.env.local)이 필요해요'
const NO_NICK = '먼저 "내 스탬프" 페이지에서 닉네임을 정해 주세요'

// 여러 페이지가 함께 쓰는 상태. 사용법: const nickname = useAppStore((s) => s.nickname)
export const useAppStore = create(
  persist(
    (set, get) => ({
      // 사용자 닉네임 (localStorage 에 저장)
      nickname: '',
      setNickname: (nickname) => set({ nickname: nickname.trim(), stamps: [] }),

      // 알림(토스트): get().toast('메시지')
      toasts: [],
      toast: (message, variant = 'success') => {
        const id = Date.now() + Math.random()
        set({ toasts: [...get().toasts, { id, message, variant }] })
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
      },

      // 스탬프 — Supabase stamps 테이블과 동기화
      stamps: [],
      stampsLoading: false,

      loadStamps: async () => {
        const { nickname, toast } = get()
        if (!supabase || !nickname) return set({ stamps: [] })
        set({ stampsLoading: true })
        const { data, error } = await supabase
          .from('stamps').select('*')
          .eq('nickname', nickname)
          .order('created_at', { ascending: false })
        set({ stampsLoading: false })
        if (error) return toast(error.message, 'danger')
        set({ stamps: data })
      },

      // 같은 축제를 다시 찍으면 별점·후기만 갱신 (nickname + festival_id 가 유일)
      saveStamp: async (festival, { rating, comment }) => {
        const { nickname, toast } = get()
        if (!supabase) return toast(NO_DB, 'warning')
        if (!nickname) return toast(NO_NICK, 'warning')
        const row = {
          nickname,
          festival_id: String(festival.id),
          festival_title: festival.title,
          rating: rating || null,
          comment: comment?.trim() || null,
        }
        const { data, error } = await supabase
          .from('stamps').upsert(row, { onConflict: 'nickname,festival_id' }).select().single()
        if (error) return toast(error.message, 'danger')
        set({ stamps: [data, ...get().stamps.filter((s) => s.id !== data.id)] })
        toast('스탬프를 찍었어요!')
        get().loadReviews()
        return data
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

      // 내 일정 — 담아 둔 축제 id (3D 지도에서 동선과 이동 거리를 비교한다)
      plan: [],
      togglePlan: (id) => {
        const plan = get().plan
        set({ plan: plan.includes(id) ? plan.filter((x) => x !== id) : [...plan, id] })
      },
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
      partialize: (s) => ({ nickname: s.nickname, plan: s.plan }),
    },
  ),
)
