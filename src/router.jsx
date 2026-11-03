import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Festivals from './pages/Festivals'
import FestivalDetail from './pages/FestivalDetail'
import Stamps from './pages/Stamps'
import Planner from './pages/Planner'
import Login from './pages/Login'
import ServiceStatus from './pages/ServiceStatus'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'

// 페이지 추가: ① pages/ 에 파일 ② NAV_ITEMS 한 줄 ③ routes 한 줄
// 아이콘: https://icons.getbootstrap.com
export const NAV_ITEMS = [
  { to: '/', label: '홈', icon: 'house' },
  { to: '/festivals', label: '축제', icon: 'calendar-event' },
  { to: '/map', label: '지도', icon: 'map' },
  { to: '/stamps', label: '내 스탬프', icon: 'patch-check' },
  { to: '/planner', label: 'AI 일정', icon: 'calendar2-heart' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'festivals', element: <Festivals /> },
      { path: 'festivals/:id', element: <FestivalDetail /> },
      // 지도 라이브러리(leaflet)는 이 페이지에 들어갈 때만 내려받는다
      { path: 'map', lazy: async () => ({ Component: (await import('./pages/FestivalMap')).default }) },
      { path: 'stamps', element: <Stamps /> },
      { path: 'planner', element: <Planner /> },
      { path: 'agent', element: <Navigate to="/planner" replace /> }, // 예전 주소
      { path: 'login', element: <Login /> },
      { path: 'status', element: <ServiceStatus /> },
      { path: 'signup', element: <Signup /> },
    ],
  },
])
