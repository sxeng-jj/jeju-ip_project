import { useEffect, useMemo, useState } from 'react'
import { Alert, ButtonGroup, Col, Container, Row, Spinner, ToggleButton } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import FestivalCard from '../components/FestivalCard'
import WeatherBadge from '../components/WeatherBadge'
import { fetchFestivals, fetchWeather } from '../api/client'
import StampModal from '../components/StampModal'
import { useAppStore } from '../store/useAppStore'
import { monthOf } from '../lib/date'

const MONTHS = ['전체', ...Array.from({ length: 12 }, (_, i) => `${i + 1}월`)]
const CITIES = ['제주시', '서귀포시']

// STEP 2·3: TourAPI 행사정보 + 기상청 예보
export default function Festivals() {
  const [list, setList] = useState([])
  const [weather, setWeather] = useState({}) // { 제주시: [...], 서귀포시: [...] }
  const [weatherError, setWeatherError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(0) // 0 = 전체
  const [stampTarget, setStampTarget] = useState(null) // 모달에 띄울 축제

  const nickname = useAppStore((s) => s.nickname)
  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const saveStamp = useAppStore((s) => s.saveStamp)
  const toast = useAppStore((s) => s.toast)

  useEffect(() => { loadStamps() }, [nickname, loadStamps])

  const stampOf = (f) => stamps.find((s) => s.festival_id === String(f.id))
  const openStamp = (f) =>
    nickname ? setStampTarget(f) : toast('먼저 "내 스탬프" 페이지에서 닉네임을 정해 주세요', 'warning')

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

  const shown = useMemo(
    () => (month === 0 ? list : list.filter((f) => monthOf(f.start) === month)),
    [list, month],
  )

  return (
    <Container>
      <PageHeader icon="calendar-event" title="제주 축제" sub={`한국관광공사 TourAPI · 올해 ${list.length}건`} />

      <Alert variant="dark" className="small">
        <strong className="me-2">오늘 날씨 (기상청)</strong>
        {weatherError && <span className="text-warning">불러오지 못했어요: {weatherError}</span>}
        {CITIES.map((c) =>
          weather[c]?.[0] ? (
            <span key={c} className="me-3">{c} <WeatherBadge w={weather[c][0]} /></span>
          ) : null,
        )}
      </Alert>

      <ButtonGroup className="flex-wrap mb-4">
        {MONTHS.map((label, i) => (
          <ToggleButton
            key={label}
            id={`month-${i}`}
            type="radio"
            variant="outline-primary"
            size="sm"
            checked={month === i}
            onChange={() => setMonth(i)}
          >
            {label}
          </ToggleButton>
        ))}
      </ButtonGroup>

      {loading && <Spinner />}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && shown.length === 0 && <Alert variant="secondary">이 달에 시작하는 축제가 없어요.</Alert>}

      <Row xs={1} sm={2} lg={3} className="g-3 pb-5">
        {shown.map((f) => (
          <Col key={f.id}>
            <FestivalCard festival={f} weather={weather} stamped={Boolean(stampOf(f))} onStamp={openStamp} />
          </Col>
        ))}
      </Row>

      {stampTarget && (
        <StampModal
          festival={stampTarget}
          existing={stampOf(stampTarget)}
          onSave={saveStamp}
          onClose={() => setStampTarget(null)}
        />
      )}
    </Container>
  )
}
