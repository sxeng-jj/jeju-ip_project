import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Badge, ButtonGroup, Col, Container, ListGroup, Row, Spinner, Tab, Tabs, ToggleButton } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import SpotItem from '../components/SpotItem'
import StampModal from '../components/StampModal'
import WeatherBadge from '../components/WeatherBadge'
import { fetchFestivals, fetchNearby, fetchWeather } from '../api/client'
import { buildCourse, courseLength, isRainy } from '../lib/course'
import { fmtDist } from '../lib/geo'
import { fmtYmd } from '../lib/date'
import { cityOf, forecastFor } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'

const RADII = [3000, 5000, 10000]
const KINDS = ['관광지', '문화시설', '국가유산']

// 축제를 중심으로 주변 관광지·문화시설·국가유산을 모아 날씨에 맞는 하루 코스를 보여준다
export default function FestivalDetail() {
  const { id } = useParams()
  const [festival, setFestival] = useState(null)
  const [weather, setWeather] = useState(null)
  const [nearby, setNearby] = useState([])
  const [radius, setRadius] = useState(5000)
  const [loading, setLoading] = useState(true)
  const [nearLoading, setNearLoading] = useState(false)
  const [error, setError] = useState('')
  const [stampTarget, setStampTarget] = useState(null)

  const nickname = useAppStore((s) => s.nickname)
  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const saveStamp = useAppStore((s) => s.saveStamp)
  const toast = useAppStore((s) => s.toast)

  useEffect(() => { loadStamps() }, [nickname, loadStamps])

  // 축제 찾기 → 그 지역 날씨
  useEffect(() => {
    fetchFestivals()
      .then((list) => {
        const f = list.find((x) => x.id === id)
        if (!f) throw new Error('축제를 찾을 수 없어요')
        setFestival(f)
        return fetchWeather(cityOf(f)).then((days) => setWeather({ [cityOf(f)]: days })).catch(() => {})
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // 주변 장소 (반경이 바뀔 때마다)
  useEffect(() => {
    if (!festival) return
    let dead = false
    setNearLoading(true)
    fetchNearby(festival.lat, festival.lng, radius)
      .then((d) => { if (!dead) setNearby(d) })
      .catch((e) => { if (!dead) setError(e.message) })
      .finally(() => { if (!dead) setNearLoading(false) })
    return () => { dead = true }
  }, [festival, radius])

  const w = festival && forecastFor(festival, weather)
  const rainy = isRainy(w)
  const center = festival && { lat: festival.lat, lng: festival.lng }
  const course = useMemo(() => (center ? buildCourse(center, nearby, { rainy }) : []), [center?.lat, center?.lng, nearby, rainy])

  const stampOf = (s) => stamps.find((x) => x.festival_id === String(s.id))
  const openStamp = (s) =>
    nickname ? setStampTarget(s) : toast('먼저 "내 스탬프" 페이지에서 닉네임을 정해 주세요', 'warning')

  if (loading) return <Container className="py-5"><Spinner /></Container>
  if (!festival) return <Container className="py-4"><Alert variant="danger">{error || '축제를 찾을 수 없어요'}</Alert><Link to="/festivals">← 축제 목록</Link></Container>

  return (
    <Container className="pb-5">
      <PageHeader icon="signpost-split" title={festival.title} sub={`${fmtYmd(festival.start)} ~ ${fmtYmd(festival.end)} · ${festival.addr}`} />
      <div className="mb-3 d-flex flex-wrap gap-2">
        <Link to="/festivals" className="btn btn-sm btn-outline-light"><i className="bi bi-arrow-left me-1" />축제 목록</Link>
        <Link to={`/map?festival=${festival.id}`} className="btn btn-sm btn-primary"><i className="bi bi-globe-asia-australia me-1" />3D 지도에서 보기</Link>
      </div>

      {error && <Alert variant="warning">{error}</Alert>}

      <Row className="g-4">
        <Col lg={5}>
          {festival.image && <img src={festival.image} alt={festival.title} className="img-fluid rounded mb-3 w-100" style={{ maxHeight: 280, objectFit: 'cover' }} />}

          <Alert variant="dark" className="mb-3">
            <div className="fw-semibold mb-1"><i className="bi bi-cloud-sun me-1" />축제 기간 날씨</div>
            {w ? (
              <>
                <WeatherBadge w={w} showDate />
                <div className="small mt-2">
                  {rainy
                    ? '비 소식이 있어요. 실내 문화시설을 먼저 넣은 코스를 추천해요.'
                    : '날씨가 괜찮아요. 야외 관광지를 먼저 넣은 코스를 추천해요.'}
                </div>
              </>
            ) : (
              <span className="small text-secondary">예보는 오늘부터 약 3일치만 제공돼요. 축제 날짜가 가까워지면 날씨에 맞춰 코스가 바뀌어요. (지금은 야외 위주 코스)</span>
            )}
          </Alert>

          <div className="mb-2 small text-secondary">검색 반경</div>
          <ButtonGroup className="mb-3">
            {RADII.map((r) => (
              <ToggleButton key={r} id={`r-${r}`} type="radio" size="sm" variant="outline-primary" checked={radius === r} onChange={() => setRadius(r)}>
                {r / 1000}km
              </ToggleButton>
            ))}
          </ButtonGroup>
        </Col>

        <Col lg={7}>
          <h5 className="mb-1">추천 하루 코스</h5>
          <p className="small text-secondary">
            축제장 출발 · {course.length}곳 · 총 이동 약 {fmtDist(courseLength(center, course))}
            {rainy && <Badge bg="info" className="ms-2">비 오는 날 코스</Badge>}
          </p>
          {nearLoading && <Spinner size="sm" />}
          {!nearLoading && course.length === 0 && <Alert variant="secondary">이 반경에는 추천할 장소가 없어요. 반경을 넓혀 보세요.</Alert>}
          <ListGroup className="mb-4">
            {course.map((s, i) => (
              <SpotItem key={s.id} spot={s} index={i} stamped={Boolean(stampOf(s))} onStamp={openStamp} />
            ))}
          </ListGroup>

          <h5 className="mb-2">주변 전체 ({nearby.length})</h5>
          <Tabs defaultActiveKey="관광지" className="mb-2">
            {KINDS.map((k) => {
              const list = nearby.filter((s) => s.kind === k)
              return (
                <Tab key={k} eventKey={k} title={`${k} ${list.length}`}>
                  <ListGroup className="map3d-list">
                    {list.length === 0 && <ListGroup.Item className="small text-secondary">이 반경에는 없어요</ListGroup.Item>}
                    {list.map((s) => <SpotItem key={s.id} spot={s} stamped={Boolean(stampOf(s))} onStamp={openStamp} />)}
                  </ListGroup>
                </Tab>
              )
            })}
          </Tabs>
        </Col>
      </Row>

      {stampTarget && <StampModal festival={stampTarget} existing={stampOf(stampTarget)} onSave={saveStamp} onClose={() => setStampTarget(null)} />}
    </Container>
  )
}
