import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

// 로그인이 필요한 동작(스탬프 등)에서 로그인하지 않았을 때 부르는 함수를 돌려준다.
// 안내 알림을 띄우고 로그인 페이지로 보내며, 로그인하면 지금 보던 페이지로 돌아온다.
export function useNeedLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useAppStore((s) => s.toast)
  return () => {
    toast('스탬프는 로그인 후에 찍을 수 있어요', 'warning')
    navigate('/login', { state: { from: location.pathname + location.search } })
  }
}
