// 전국문화축제표준데이터 (data.go.kr / tn_pubr_public_cltur_fstvl_api) — 지자체가 등록한 문화축제 중 제주만
// 키: 이 서비스만 다른 키를 받았다면 CULTURE_FESTIVAL_KEY, 아니면 DATA_GO_KR_KEY 를 쓴다.
import { fetchRetry } from './http.js'
import { areaOf, cityOfAddr, cityOfCoord } from './region.js'

const URL_ = 'https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api'
const PAGE = 1000
const TTL = 6 * 3600e3
let cache = { at: 0, list: [] }

const key = () => {
  const k = process.env.CULTURE_FESTIVAL_KEY || process.env.DATA_GO_KR_KEY
  if (!k) throw new Error('DATA_GO_KR_KEY 환경변수가 없어요 (.env.local 또는 Vercel Environment Variables)')
  return k
}

const hash = (s) => {
  let h = 5381
  for (const c of s) h = ((h << 5) + h + c.codePointAt(0)) >>> 0
  return h.toString(36)
}
const ymd = (s = '') => s.replaceAll('-', '')

// 표준데이터에는 유형 분류가 없어 이름으로 어림잡는다
function groupOf(name) {
  if (/전시|박람회|비엔날레/.test(name)) return { group: '전시', label: '전시' }
  if (/공연|콘서트|버스킹|연주|음악회|뮤지컬|합창|예술공연/.test(name)) return { group: '공연', label: '공연' }
  if (/축제|페스티벌|페스타|축전|한마당|제$/.test(name)) return { group: '축제', label: '지역축제' }
  return { group: '행사', label: '기타행사' }
}

function normalize(r) {
  const addr = r.rdnmadr || r.lnmadr || ''
  const lat = Number(r.latitude)
  const lng = Number(r.longitude)
  const city = cityOfAddr(addr) ?? cityOfCoord(lat, lng) ?? '제주시'
  return {
    id: `std-${hash(`${r.insttCode}|${r.fstvlNm}|${r.fstvlStartDate}`)}`,
    title: r.fstvlNm,
    addr,
    place: r.opar,
    city,
    area: areaOf(addr, city),
    ...groupOf(r.fstvlNm),
    image: '',
    lng,
    lat,
    tel: r.phoneNumber,
    start: ymd(r.fstvlStartDate),
    end: ymd(r.fstvlEndDate),
    source: 'std',
    // 상세용 원본 필드
    _overview: r.fstvlCo,
    _sponsor: [r.mnnstNm, r.auspcInsttNm, r.suprtInsttNm].filter(Boolean),
    _homepage: r.homepageUrl,
    _related: r.relateInfo,
  }
}

// 전국 데이터를 한 번 받아 제주만 남긴다 (전체 약 1,400건)
async function loadJeju() {
  if (Date.now() - cache.at < TTL && cache.list.length) return cache.list
  const all = []
  for (let page = 1; page <= 10; page++) {
    const qs = new URLSearchParams({ serviceKey: key(), pageNo: String(page), numOfRows: String(PAGE), type: 'json' })
    const r = await fetchRetry(`${URL_}?${qs}`)
    const text = await r.text()
    let j
    try { j = JSON.parse(text) } catch { throw new Error('문화축제표준데이터 응답이 JSON이 아님: ' + text.slice(0, 100)) }
    const gw = j?.OpenAPI_ServiceResponse?.cmmMsgHeader
    if (gw) throw new Error(`문화축제표준데이터 인증 오류: ${gw.returnAuthMsg ?? gw.errMsg} (${gw.returnReasonCode})`)
    const body = j?.body
    if (j?.header?.resultCode !== '00') throw new Error(`문화축제표준데이터 오류 ${j?.header?.resultCode}: ${j?.header?.resultMsg}`)
    const it = body?.items?.item ?? []
    all.push(...(Array.isArray(it) ? it : [it]))
    if (all.length >= Number(body?.totalCount) || it.length === 0) break
  }
  const list = all
    .filter((r) => /제주/.test(`${r.rdnmadr}${r.lnmadr}${r.insttNm}`) && r.fstvlNm && r.fstvlStartDate)
    .map(normalize)
  cache = { at: Date.now(), list }
  return list
}

// year 해 1월 1일 이후까지 이어지는 제주 문화축제
export async function listStdFestivals({ year } = {}) {
  const from = `${year}0101`
  return (await loadJeju())
    .filter((f) => f.end >= from)
    .map(({ _overview, _sponsor, _homepage, _related, ...f }) => f)
}

export async function getStdDetail(id) {
  const f = (await loadJeju()).find((x) => x.id === id)
  if (!f) throw new Error('축제를 찾을 수 없어요')
  return {
    id: f.id,
    title: f.title,
    overview: [f._overview, f._related && `관련 정보: ${f._related}`].filter(Boolean).join('\n\n'),
    addr: f.addr,
    city: f.city,
    area: f.area,
    group: f.group,
    label: f.label,
    tel: f.tel,
    homepage: /^https?:\/\//.test(f._homepage) ? f._homepage : '',
    image: '',
    images: [],
    lng: f.lng,
    lat: f.lat,
    start: f.start,
    end: f.end,
    playtime: '',
    place: f.place,
    placeInfo: '',
    fee: '',
    age: '',
    booking: '',
    sponsor: [...new Set(f._sponsor.flatMap((s) => s.split('+')))].map((name) => [name, '']),
    program: '',
    subevent: '',
    source: 'std',
  }
}
