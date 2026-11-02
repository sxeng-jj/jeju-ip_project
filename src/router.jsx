import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Festivals from './pages/Festivals'
import FestivalDetail from './pages/FestivalDetail'
import Stamps from './pages/Stamps'
import Agent from './pages/Agent'
import NotFound from './pages/NotFound'

// 페이지 추가: ① pages/ 에 파일 ② NAV_ITEMS 한 줄 ③ routes 한 줄
// 아이콘: https://icons.getbootstrap.com
export const NAV_ITEMS = [
  { to: '/', label: '홈', icon: 'house' },
  { to: '/festivals', label: '축제', icon: 'calendar-event' },
  { to: '/map', label: '3D 지도', icon: 'globe-asia-australia' },
  { to: '/stamps', label: '내 스탬프', icon: 'patch-check' },
  { to: '/agent', label: 'AI 가이드', icon: 'robot' },
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
      // 3D 라이브러리(three)가 무거워서 이 페이지에 들어갈 때만 내려받는다
      { path: 'map', lazy: async () => ({ Component: (await import('./pages/Map3D')).default }) },
      { path: 'stamps', element: <Stamps /> },
      { path: 'agent', element: <Agent /> },
    ],
  },
])
