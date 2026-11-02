import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { statusOf } from '../lib/date'
import { seasonColor } from '../lib/jeju'

const JEJU_CENTER = [33.38, 126.55]
const BOUNDS = [[32.9, 125.9], [33.75, 127.2]] // 제주 둘레만 볼 수 있게 가둔다

// 핀: 시작 계절 색의 동그라미. 선택하면 커지고 주황 테두리, 이미 끝난 행사는 어둡게.
const pinIcon = (f, selected) =>
  L.divIcon({
    className: 'jm-wrap',
    html: `<div class="jm-pin${selected ? ' sel' : ''}${statusOf(f) === 'ended' ? ' ended' : ''}" style="background:${seasonColor(f.start)}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

// 제주 지도 (Leaflet + OpenStreetMap, 키 불필요).
// 같은 장소에 몰린 행사는 숫자 묶음으로 보이고, 누르면 펼쳐진다. route 는 내 일정(날짜 순)이다.
export default function JejuMap({ festivals, selectedId, onSelect, route = [], roadPath }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const routeRef = useRef(null)
  const markersRef = useRef(new Map()) // id → 마커
  const festRef = useRef(new Map()) // id → 행사
  const selectedRef = useRef(null) // 지금 선택된 id
  const focusedRef = useRef(null) // 마지막으로 카메라를 옮긴 id (필터를 바꿀 때마다 다시 날아가지 않게)
  const onSelectRef = useRef(onSelect)

  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // 지도 만들기 (한 번)
  useEffect(() => {
    const map = L.map(elRef.current, {
      center: JEJU_CENTER, zoom: 10, minZoom: 9, maxZoom: 17, maxBounds: BOUNDS, maxBoundsViscosity: 0.8,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map)

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 38,
      spiderfyOnMaxZoom: true, // 좌표가 똑같은 행사들은 끝까지 확대해도 겹치므로, 눌러서 부채꼴로 펼친다
      iconCreateFunction: (c) =>
        L.divIcon({ className: 'jm-wrap', html: `<div class="jm-cluster">${c.getChildCount()}</div>`, iconSize: [38, 38] }),
    })
    map.addLayer(cluster)

    mapRef.current = map
    clusterRef.current = cluster
    routeRef.current = L.layerGroup().addTo(map)

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(elRef.current)
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = clusterRef.current = routeRef.current = null
      markersRef.current.clear()
      focusedRef.current = null
    }
  }, [])

  // 선택한 행사로 날아가서 말풍선을 연다. 묶음 속에 있으면 펼쳐서 보여준다.
  const focus = (id) => {
    const m = markersRef.current.get(id)
    const map = mapRef.current
    if (!m || !map) return
    focusedRef.current = id
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 13), { duration: 0.7 })
    map.once('moveend', () => clusterRef.current?.zoomToShowLayer(m, () => m.openTooltip()))
  }

  // 핀: 행사 목록이 바뀔 때마다 다시 만든다
  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return
    cluster.clearLayers()
    markersRef.current.clear()
    festRef.current.clear()
    const markers = festivals
      .filter((f) => f.lat && f.lng)
      .map((f) => {
        const m = L.marker([f.lat, f.lng], { icon: pinIcon(f, f.id === selectedRef.current), riseOnHover: true })
        const tip = document.createElement('div') // 제목은 외부 데이터라 HTML 이 아닌 텍스트로만 넣는다
        tip.textContent = f.title
        m.bindTooltip(tip, { direction: 'top', offset: [0, -12] })
        m.on('click', () => onSelectRef.current(f))
        markersRef.current.set(f.id, m)
        festRef.current.set(f.id, f)
        return m
      })
    cluster.addLayers(markers)
    // 주소로 바로 들어온 선택(?festival=ID)은 행사 목록이 도착한 뒤에 한 번 보여준다
    if (selectedRef.current && focusedRef.current !== selectedRef.current) focus(selectedRef.current)
  }, [festivals])

  // 선택: 이전 핀은 원래대로, 새 핀은 강조하고 그리로 이동
  useEffect(() => {
    const prev = selectedRef.current
    selectedRef.current = selectedId
    const restyle = (id, sel) => {
      const m = markersRef.current.get(id)
      const f = festRef.current.get(id)
      if (m && f) m.setIcon(pinIcon(f, sel))
    }
    if (prev && prev !== selectedId) restyle(prev, false)
    if (!selectedId) { focusedRef.current = null; return }
    restyle(selectedId, true)
    if (focusedRef.current !== selectedId) focus(selectedId)
  }, [selectedId])

  // 내 일정: 날짜 순서대로 주황 점선으로 잇고 번호를 붙인다
  useEffect(() => {
    const layer = routeRef.current
    if (!layer) return
    layer.clearLayers()
    if (route.length === 0) return
    if (route.length > 1) {
      // 도로 길을 알면 실제 길을 따라 실선으로, 아니면 직선 점선으로 잇는다
      if (roadPath?.length) L.polyline(roadPath, { color: '#f08a17', weight: 5, opacity: 0.9 }).addTo(layer)
      else L.polyline(route.map((f) => [f.lat, f.lng]), { color: '#f08a17', weight: 4, opacity: 0.9, dashArray: '8 8' }).addTo(layer)
    }
    route.forEach((f, i) =>
      L.marker([f.lat, f.lng], {
        icon: L.divIcon({ className: 'jm-wrap', html: `<div class="plan-num">${i + 1}</div>`, iconSize: [24, 24], iconAnchor: [12, 36] }),
        interactive: false, // 번호가 아래 핀의 클릭을 막지 않게
        zIndexOffset: 1000,
      }).addTo(layer),
    )
  }, [route, roadPath])

  return <div ref={elRef} className="jm-map" />
}
