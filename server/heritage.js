// 국가유산청 국가유산 검색 오픈API (키 불필요, XML 응답)
// 주의: 이름(ccbaMnm1) 검색이 불안정해서(해녀·영등 등이 0건) 제주 전체를 한 번 받아 서버에서 직접 거른다.
import { fetchRetry } from './http.js'
import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser()
const TTL = 6 * 3600e3
let cache = { at: 0, list: [] }

async function loadAll() {
  if (Date.now() - cache.at < TTL && cache.list.length) return cache.list
  const params = new URLSearchParams({ ccbaCtcd: '50', pageUnit: '1000', pageIndex: '1' }) // 50 = 제주
  const r = await fetchRetry(`https://www.khs.go.kr/cha/SearchKindOpenapiList.do?${params}`)
  if (!r.ok) throw new Error(`국가유산청 응답 오류 ${r.status}`)
  const item = parser.parse(await r.text())?.result?.item
  const list = (!item ? [] : Array.isArray(item) ? item : [item]).map((h) => ({
    id: `${h.ccbaKdcd}-${h.ccbaAsno}-${h.ccbaCtcd}`,
    name: String(h.ccbaMnm1),
    kind: h.ccmaName,
    city: h.ccsiName,
    lat: Number(h.latitude) || null,
    lng: Number(h.longitude) || null,
  }))
  cache = { at: Date.now(), list }
  return list
}

// keyword: 이름에 포함된 글자 (공백 무시) · kind: 종목(예: 국가무형유산) · limit: 최대 개수
export async function searchHeritage({ keyword = '', kind = '', limit = 1000 } = {}) {
  const list = await loadAll()
  const norm = (s) => String(s).replaceAll(' ', '')
  const k = norm(keyword)
  return list
    .filter((h) => (!k || norm(h.name).includes(k)) && (!kind || h.kind === kind))
    .slice(0, limit)
}

// 종목 목록(필터 버튼용)
export async function heritageKinds() {
  const list = await loadAll()
  return [...new Set(list.map((h) => h.kind))]
}
