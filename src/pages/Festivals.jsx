import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, ButtonGroup, Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Chips from '../components/Chips'
import FestivalCard from '../components/FestivalCard'
import MonthCalendar from '../components/MonthCalendar'
import StampModal from '../components/StampModal'
import WeatherBadge from '../components/WeatherBadge'
import { fetchFestivals, fetchWeather } from '../api/client'
import { overlapsMonth, sortFestivals, statusOf, todayYmd } from '../lib/date'
import { GROUP_STYLE, GROUPS, THEMES, themesOf, typeOf } from '../lib/festivalMeta'
import { useAppStore } from '../store/useAppStore'

const CITIES = ['제주시', '서귀포시']
const STATUSES = [
  { value: 'all', label: '전체' },
  { value: 'ongoing', label: '진행중' },
  { value: 'upcoming', label: '예정' },
  { value: 'ended', label: '종료' },
]
const count = (list, fn) => list.filter(fn).length
const PAGE = 24

// 축제·공연·행사를 검색하고, 지역·유형·상태로 거르고, 월별 목록 또는 월간 달력으로 본다
export default function Festivals() {
  const today = todayYmd()
  const thisYear = Number(today.slice(0, 4))

  const [list, setList] = useState([])
  const [weather, setWeather] = useState({})
  const [weatherError, setWeatherError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stampTarget, setStampTarget] = useState(null)

  // 필터 상태
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('all') // all | 제주시 | 서귀포시
  const [area, setArea] = useState('all') // all | 읍·면 이름
  const [group, setGroup] = useState('all') // all | 축제 | 공연 | 행사
  const [status, setStatus] = useState('all')
  const [theme, setTheme] = useState('all') // all | 테마 key
  // 보기 상태
  const [view, setView] = useState('list') // list | calendar
  const [year, setYear] = useState(thisYear)
  const [month, setMonth] = useState(0) // 0 = 전체 (달력에서는 1~12)
  const [limit, setLimit] = useState(PAGE) // 카드 목록에 보여줄 개수 (더 보기로 늘린다)

  const nickname = useAppStore((s) => s.nickname)
  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const saveStamp = useAppStore((s) => s.saveStamp)
  const toast = useAppStore((s) => s.toast)
  const reviews = useAppStore((s) => s.reviews)
  const loadReviews = useAppStore((s) => s.loadReviews)
  const plan = useAppStore((s) => s.plan)
  const togglePlan = useAppStore((s) => s.togglePlan)

  useEffect(() => { loadStamps() }, [nickname, loadStamps])
  useEffect(() => { loadReviews() }, [loadReviews])

  useEffect(() => {
    fetchFestivals()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    // 날씨는 실패해도 축제 목록은 보여준다
    Promise.all(CITIES.map((c) => fetchWeather(c).then((d) => [c, d])))
      .then((pairs) => setWeather(Object.fromEntries(pairs)))
      .catch((e) => setWeatherError(e.message))
  }, [])

  // 읍·면 칩: 고른 시에 속한 곳만
  const areas = useMemo(() => {
    if (city === 'all') return []
    return [...new Set(list.filter((f) => f.city === city).map((f) => f.area))].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [list, city])

  // 월을 뺀 모든 필터를 적용한 목록
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter(
      (f) =>
        (!q || `${f.title} ${f.addr} ${f.area}`.toLowerCase().includes(q)) &&
        (city === 'all' || f.city === city) &&
        (area === 'all' || f.area === area) &&
        (group === 'all' || typeOf(f).group === group) &&
        (status === 'all' || statusOf(f, today) === status) &&
        (theme === 'all' || themesOf(f).includes(theme)),
    )
  }, [list, query, city, area, group, status, theme, today])

  const shown = useMemo(
    () => sortFestivals(month === 0 ? filtered : filtered.filter((f) => overlapsMonth(f, year, month))),
    [filtered, year, month],
  )

  // 조건이 바뀌면 처음 한 페이지부터 다시 보여준다
  useEffect(() => { setLimit(PAGE) }, [query, city, area, group, status, theme, year, month])

  const pickCity = (c) => { setCity(c); setArea('all') }
  const reset = () => { setQuery(''); setCity('all'); setArea('all'); setGroup('all'); setStatus('all'); setTheme('all') }
  const dirty = query || city !== 'all' || area !== 'all' || group !== 'all' || status !== 'all' || theme !== 'all'

  // 달력 월 이동 (해를 넘기면 연도도 바꾼다)
  const shift = (d) => {
    let y = year, m = (month || Number(today.slice(4, 6))) + d
    if (m < 1) { m = 12; y -= 1 } else if (m > 12) { m = 1; y += 1 }
    setYear(y); setMonth(m)
  }
  const switchView = (v) => {
    setView(v)
    if (v === 'calendar' && month === 0) { setYear(thisYear); setMonth(Number(today.slice(4, 6))) }
  }

  const stampOf = (f) => stamps.find((s) => s.festival_id === String(f.id))
  const openStamp = (f) =>
    nickname ? setStampTarget(f) : toast('먼저 "내 스탬프" 페이지에서 닉네임을 정해 주세요', 'warning')

  return (
    <Container>
      <PageHeader icon="calendar-event" title="제주 축제·행사" sub={`축제·공연·전시·행사 ${list.length}건 · 한국관광공사, 한국문화정보원, 지자체 문화축제 데이터`} />

      <div className="small mb-3 p-2 px-3 festa-weather">
        <strong className="me-2">오늘 날씨 (기상청)</strong>
        {weatherError && <span className="text-warning">불러오지 못했어요: {weatherError}</span>}
        {CITIES.map((c) =>
          weather[c]?.[0] ? <span key={c} className="me-3">{c} <WeatherBadge w={weather[c][0]} /></span> : null,
        )}
      </div>

      {/* ── 검색·필터 ── */}
      <Form.Control
        className="mb-3"
        type="search"
        placeholder="축제·행사 이름이나 지역으로 검색 (예: 오름, 서귀포, 애월)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="d-flex flex-column gap-2 mb-3">
        <Chips
          label="지역"
          value={city}
          onChange={pickCity}
          options={[{ value: 'all', label: '전체', count: list.length }, ...CITIES.map((c) => ({ value: c, label: c, count: count(list, (f) => f.city === c) }))]}
        />
        {areas.length > 0 && (
          <Chips
            label="읍·면"
            value={area}
            onChange={setArea}
            options={[{ value: 'all', label: '전체' }, ...areas.map((a) => ({ value: a, label: a, count: count(list, (f) => f.city === city && f.area === a) }))]}
          />
        )}
        <Chips
          label="유형"
          value={group}
          onChange={setGroup}
          options={[{ value: 'all', label: '전체' }, ...GROUPS.map((g) => ({ value: g, label: g, count: count(list, (f) => typeOf(f).group === g) }))]}
        />
        <Chips label="상태" value={status} onChange={setStatus} options={STATUSES} />
        <Chips
          label="테마"
          value={theme}
          onChange={setTheme}
          options={[{ value: 'all', label: '전체' }, ...THEMES.map((t) => ({ value: t.key, label: t.label, count: count(list, (f) => themesOf(f).includes(t.key)) }))]}
        />
        {theme !== 'all' && <div className="small text-secondary ms-1">테마는 행사 분류와 이름을 바탕으로 자동 분류한 것이라 정확하지 않을 수 있어요.</div>}
      </div>

      {/* ── 보기 전환 · 월 선택 ── */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <ButtonGroup size="sm">
          <Button variant={view === 'list' ? 'primary' : 'outline-secondary'} onClick={() => switchView('list')}>
            <i className="bi bi-grid me-1" />목록
          </Button>
          <Button variant={view === 'calendar' ? 'primary' : 'outline-secondary'} onClick={() => switchView('calendar')}>
            <i className="bi bi-calendar3 me-1" />월간 달력
          </Button>
        </ButtonGroup>

        {view === 'calendar' ? (
          <div className="d-flex align-items-center gap-2">
            <Button size="sm" variant="outline-secondary" aria-label="이전 달" onClick={() => shift(-1)}><i className="bi bi-chevron-left" /></Button>
            <strong style={{ minWidth: '7rem', textAlign: 'center' }}>{year}년 {month}월</strong>
            <Button size="sm" variant="outline-secondary" aria-label="다음 달" onClick={() => shift(1)}><i className="bi bi-chevron-right" /></Button>
            <Button size="sm" variant="link" onClick={() => { setYear(thisYear); setMonth(Number(today.slice(4, 6))) }}>이번 달</Button>
          </div>
        ) : (
          <Form.Select size="sm" style={{ width: 'auto' }} value={month} onChange={(e) => { setMonth(Number(e.target.value)); setYear(thisYear) }}>
            <option value={0}>전체 기간</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{thisYear}년 {i + 1}월</option>)}
          </Form.Select>
        )}

        <span className="small text-secondary ms-auto">
          {shown.length}건{dirty && <Button size="sm" variant="link" className="py-0" onClick={reset}>필터 초기화</Button>}
        </span>
      </div>

      {loading && <Spinner />}
      {error && <Alert variant="danger">{error}</Alert>}

      {view === 'calendar' && !loading && !error && (
        <div className="mb-4">
          <div className="small d-flex gap-3 mb-2">
            {GROUPS.map((g) => (
              <span key={g}><i className="bi bi-square-fill me-1" style={{ color: GROUP_STYLE[g].color }} />{g}</span>
            ))}
            <span className="text-secondary">막대를 누르면 상세정보로 이동해요</span>
          </div>
          <MonthCalendar year={year} month={month} festivals={shown} />
        </div>
      )}

      {!loading && !error && shown.length === 0 && <Alert variant="secondary">조건에 맞는 축제·행사가 없어요. 필터를 줄여 보세요.</Alert>}

      <Row xs={1} sm={2} lg={3} className="g-3 pb-5">
        {shown.slice(0, limit).map((f) => (
          <Col key={f.id}>
            <FestivalCard festival={f} weather={weather} stamped={Boolean(stampOf(f))} onStamp={openStamp} review={reviews[f.id]} inPlan={plan.includes(f.id)} onPlan={togglePlan} />
          </Col>
        ))}
      </Row>

      {shown.length > limit && (
        <div className="text-center pb-5">
          <Button variant="outline-secondary" onClick={() => setLimit(limit + PAGE)}>
            더 보기 ({shown.length - limit}건 남음)
          </Button>
        </div>
      )}

      {stampTarget && (
        <StampModal festival={stampTarget} existing={stampOf(stampTarget)} onSave={saveStamp} onClose={() => setStampTarget(null)} />
      )}
    </Container>
  )
}
