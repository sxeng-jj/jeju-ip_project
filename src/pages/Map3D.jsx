import { useEffect, useMemo, useState } from 'react'
import { Alert, Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Jeju3D from '../components/Jeju3D'
import FestivalCard from '../components/FestivalCard'
import StampModal from '../components/StampModal'
import { fetchFestivals, fetchWeather } from '../api/client'
import { SEASONS } from '../lib/jeju'
import { monthOf } from '../lib/date'
import { useAppStore } from '../store/useAppStore'

const CITIES = ['제주시', '서귀포시']

// STEP 6: Three.js 3D 제주 지도 — 축제 핀을 누르면 카드와 스탬프 버튼이 나온다
export default function Map3D() {
  const [list, setList] = useState([])
  const [weather, setWeather] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(0)
  const [selected, setSelected] = useState(null)
  const [stampTarget, setStampTarget] = useState(null)

  const nickname = useAppStore((s) => s.nickname)
  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const saveStamp = useAppStore((s) => s.saveStamp)
  const toast = useAppStore((s) => s.toast)

  useEffect(() => { loadStamps() }, [nickname, loadStamps])

  useEffect(() => {
    fetchFestivals()
      .then((d) => setList(d.filter((f) => Number.isFinite(f.lng) && Number.isFinite(f.lat) && f.lng && f.lat)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    Promise.all(CITIES.map((c) => fetchWeather(c).then((d) => [c, d])))
      .then((pairs) => setWeather(Object.fromEntries(pairs)))
      .catch(() => {}) // 날씨는 없어도 지도는 보여준다
  }, [])

  const shown = useMemo(() => (month === 0 ? list : list.filter((f) => monthOf(f.start) === month)), [list, month])
  const current = shown.find((f) => f.id === selected)
  const stampOf = (f) => stamps.find((s) => s.festival_id === String(f.id))
  const openStamp = (f) =>
    nickname ? setStampTarget(f) : toast('먼저 "내 스탬프" 페이지에서 닉네임을 정해 주세요', 'warning')

  return (
    <Container>
      <PageHeader icon="globe-asia-australia" title="3D 제주 지도" sub="핀을 눌러 축제를 살펴보세요. 드래그로 지도를 돌릴 수 있어요." />

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

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3 pb-5">
        <Col lg={8}>
          <div className="map3d-wrap">
            {loading && <div className="map3d-loading"><Spinner /></div>}
            <Jeju3D festivals={shown} selectedId={selected} onSelect={(f) => setSelected(f ? f.id : null)} />
          </div>
          <p className="small text-secondary mt-2 mb-0">
            축제 {shown.length}곳 · 반짝이는 핀은 진행중, 흐린 핀은 종료된 축제예요.
          </p>
        </Col>
        <Col lg={4}>
          {current ? (
            <FestivalCard festival={current} weather={weather} stamped={Boolean(stampOf(current))} onStamp={openStamp} />
          ) : (
            <Alert variant="secondary" className="mb-0">핀을 누르면 축제 정보가 여기에 나와요.</Alert>
          )}
        </Col>
      </Row>

      {stampTarget && (
        <StampModal festival={stampTarget} existing={stampOf(stampTarget)} onSave={saveStamp} onClose={() => setStampTarget(null)} />
      )}
    </Container>
  )
}
