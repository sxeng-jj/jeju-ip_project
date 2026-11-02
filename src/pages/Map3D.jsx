import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Col, Container, Form, ListGroup, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Jeju3D from '../components/Jeju3D'
import FestivalCard from '../components/FestivalCard'
import StampModal from '../components/StampModal'
import { fetchFestivals, fetchNearby, fetchWeather } from '../api/client'
import { buildCourse, isRainy } from '../lib/course'
import { fmtDist } from '../lib/geo'
import { KIND_COLORS, SEASONS, seasonColor } from '../lib/jeju'
import { monthOf, sortFestivals, statusOf } from '../lib/date'
import { forecastFor } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'

const CITIES = ['제주시', '서귀포시']

// 3D 제주 지도 — 축제 핀을 고르면 주변 관광지·문화시설·국가유산과 하루 코스가 지도에 나타난다
export default function Map3D() {
  const [params] = useSearchParams()
  const [list, setList] = useState([])
  const [weather, setWeather] = useState({})
  const [nearby, setNearby] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(0)
  const [selected, setSelected] = useState(params.get('festival')) // ?festival=ID 로 바로 선택
  const [stampTarget, setStampTarget] = useState(null)

  const nickname = useAppStore((s) => s.nickname)
  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const saveStamp = useAppStore((s) => s.saveStamp)
  const toast = useAppStore((s) => s.toast)

  useEffect(() => { loadStamps() }, [nickname, loadStamps])

  useEffect(() => {
    fetchFestivals()
      .then((d) => setList(d.filter((f) => f.lng && f.lat)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    Promise.all(CITIES.map((c) => fetchWeather(c).then((d) => [c, d])))
      .then((pairs) => setWeather(Object.fromEntries(pairs)))
      .catch(() => {}) // 날씨는 없어도 지도는 보여준다
  }, [])

  const shown = useMemo(
    () => sortFestivals(month === 0 ? list : list.filter((f) => monthOf(f.start) === month)),
    [list, month],
  )
  const current = shown.find((f) => f.id === selected)

  // 고른 축제 주변 장소 (5km)
  useEffect(() => {
    const f = list.find((x) => x.id === selected)
    if (!f) { setNearby([]); return }
    let dead = false
    fetchNearby(f.lat, f.lng, 5000)
      .then((d) => { if (!dead) setNearby(d) })
      .catch(() => { if (!dead) setNearby([]) })
    return () => { dead = true }
  }, [selected, list])

  const focus = useMemo(() => (current ? { lat: current.lat, lng: current.lng } : null), [current])
  const rainy = current ? isRainy(forecastFor(current, weather)) : false
  const course = useMemo(() => (focus ? buildCourse(focus, nearby, { rainy }) : []), [focus, nearby, rainy])

  const stampOf = (f) => stamps.find((s) => s.festival_id === String(f.id))
  const openStamp = (f) =>
    nickname ? setStampTarget(f) : toast('먼저 "내 스탬프" 페이지에서 닉네임을 정해 주세요', 'warning')

  return (
    <Container>
      <PageHeader icon="globe-asia-australia" title="3D 제주 지도" sub="축제 핀을 누르면 주변 코스가 나타나요. 드래그로 지도를 돌릴 수 있어요." />

      <Row className="g-3 align-items-center mb-2">
        <Col xs="auto">
          <Form.Select size="sm" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setSelected(null) }}>
            <option value={0}>전체 월</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}월 시작</option>)}
          </Form.Select>
        </Col>
        <Col className="small d-flex flex-wrap gap-3">
          {Object.values(SEASONS).map((s) => (
            <span key={s.label}><i className="bi bi-circle-fill me-1" style={{ color: s.color }} />{s.label}</span>
          ))}
        </Col>
      </Row>
      {current && (
        <div className="small d-flex flex-wrap gap-3 mb-2">
          <span className="text-secondary">주변 장소:</span>
          {Object.entries(KIND_COLORS).map(([k, c]) => (
            <span key={k}><i className="bi bi-circle-fill me-1" style={{ color: c }} />{k}</span>
          ))}
          <span><span className="course-num me-1" style={{ width: '1.1rem', height: '1.1rem', fontSize: '.65rem' }}>1</span>추천 코스</span>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3 pb-5">
        <Col lg={8}>
          <div className="map3d-wrap">
            {loading && <div className="map3d-loading"><Spinner /></div>}
            <Jeju3D
              festivals={shown}
              selectedId={selected}
              onSelect={(f) => setSelected(f ? f.id : null)}
              nearby={nearby}
              course={course}
              focus={focus}
            />
          </div>
          <p className="small text-secondary mt-2 mb-0">
            축제 {shown.length}곳 · 반짝이는 핀은 진행중, 흐린 핀은 종료된 축제예요.
          </p>
        </Col>
        <Col lg={4}>
          {current ? (
            <FestivalCard festival={current} weather={weather} stamped={Boolean(stampOf(current))} onStamp={openStamp} />
          ) : (
            <Alert variant="secondary">핀을 누르거나 아래 목록에서 축제를 골라 보세요.</Alert>
          )}

          {current && course.length > 0 && (
            <div className="mt-3">
              <div className="small fw-semibold mb-1">
                추천 코스 {rainy && <span className="text-info">(비 오는 날)</span>}
                <Link to={`/festivals/${current.id}`} className="ms-2 small">자세히 →</Link>
              </div>
              <ListGroup>
                {course.map((s, i) => (
                  <ListGroup.Item key={s.id} className="small py-2 d-flex align-items-center gap-2">
                    <span className="course-num flex-shrink-0">{i + 1}</span>
                    <span className="text-truncate">{s.title}</span>
                    <span className="text-secondary ms-auto flex-shrink-0">{fmtDist(s.dist)}</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          )}

          {/* 핀이 겹쳐 있어도 여기서 고를 수 있다 */}
          <ListGroup className="mt-3 map3d-list">
            {shown.map((f) => (
              <ListGroup.Item key={f.id} action active={f.id === selected} onClick={() => setSelected(f.id)} className="small py-2">
                <i className="bi bi-circle-fill me-2" style={{ color: seasonColor(f.start), opacity: statusOf(f) === 'ended' ? 0.4 : 1 }} />
                {f.title}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
      </Row>

      {stampTarget && (
        <StampModal festival={stampTarget} existing={stampOf(stampTarget)} onSave={saveStamp} onClose={() => setStampTarget(null)} />
      )}
    </Container>
  )
}
