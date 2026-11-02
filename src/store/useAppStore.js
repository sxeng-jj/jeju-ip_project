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
        return data
      },

      removeStamp: async (id) => {
        const { toast } = get()
        if (!supabase) return toast(NO_DB, 'warning')
        const { error } = await supabase.from('stamps').delete().eq('id', id)
        if (error) return toast(error.message, 'danger')
        set({ stamps: get().stamps.filter((s) => s.id !== id) })
        toast('스탬프를 지웠어요', 'secondary')
      },
    }),
    {
      name: 'jeju-festa-store',
      partialize: (s) => ({ nickname: s.nickname }),
    },
  ),
)
