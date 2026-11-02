// 한국문화정보원 '한눈에보는문화정보조회서비스' (data.go.kr / B553457 cultureinfo) — 제주 공연·전시·행사
// 키: 이 서비스만 다른 키를 받았다면 CULTURE_INFO_KEY, 아니면 DATA_GO_KR_KEY 를 쓴다.
import { XMLParser } from 'fast-xml-parser'
import { fetchRetry } from './http.js'
import { areaOf, cityOfCoord } from './region.js'
import { httpsUrl } from './tourapi.js'

const BASE = 'https://apis.data.go.kr/B553457/cultureinfo'
const parser = new XMLParser({ parseTagValue: false }) // 날짜·좌표를 숫자로 바꾸지 않는다
const PAGE = 100
const TTL = 15 * 60e3
const cache = new Map() // year → { at, list }

const key = () => {
  const k = process.env.CULTURE_INFO_KEY || process.env.DATA_GO_KR_KEY
  if (!k) throw new Error('DATA_GO_KR_KEY 환경변수가 없어요 (.env.local 또는 Vercel Environment Variables)')
  return k
}

// 제목 등: 이중으로 인코딩된 기호(&amp;lt; → &lt; → <)를 풀어 준다
const plain = (s = '') =>
  String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
// 본문: 위에 더해 <br> 은 줄바꿈으로, 나머지 태그는 지운다
const html = (s = '') =>
  plain(s).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()

async function call(op, params) {
  const r = await fetchRetry(`${BASE}/${op}?${new URLSearchParams({ serviceKey: key(), ...params })}`)
  const xml = await r.text()
  const j = parser.parse(xml)
  const gw = j?.OpenAPI_ServiceResponse?.cmmMsgHeader
  if (gw) throw new Error(`문화정보 인증 오류: ${gw.returnAuthMsg ?? gw.errMsg} (${gw.returnReasonCode})`)
  const header = j?.response?.header
  if (!header) throw new Error('문화정보 응답을 해석하지 못했어요: ' + xml.slice(0, 100))
  if (header.resultCode !== '00') throw new Error(`문화정보 오류 ${header.resultCode}: ${header.resultMsg}`)
  const item = j.response.body?.items?.item
  return !item ? [] : Array.isArray(item) ? item : [item]
}

// serviceName(공연·전시·교육/체험·행사/축제) + realmName(세부 분야) → 화면용 유형
function typeOf(serviceName, realmName) {
  if (serviceName === '전시') return { group: '전시', label: '전시' }
  if (serviceName === '행사/축제') return { group: '축제', label: '행사/축제' }
  const label = !realmName || realmName === '기타' ? '기타공연' : realmName
  return { group: '공연', label: label === '공연' ? '기타공연' : label }
}

// year 해 1월 1일 ~ 다음 해 말에 걸치는 제주 공연·전시·행사. 교육·체험(양성과정 모집 등)은 여행자에게 쓸모가 적어 뺀다.
export async function listCulture({ year } = {}) {
  const hit = cache.get(year)
  if (hit && Date.now() - hit.at < TTL) return hit.list

  const rows = []
  for (let page = 1; page <= 15; page++) {
    const items = await call('area2', {
      PageNo: String(page), numOfrows: String(PAGE), sido: '제주', from: `${year}0101`, to: `${year + 1}1231`,
    })
    rows.push(...items)
    if (items.length < PAGE) break
  }

  const list = rows
    .filter((r) => r.serviceName !== '교육/체험')
    .map((r) => {
      const lat = Number(r.gpsY)
      const lng = Number(r.gpsX)
      return {
        id: `cul-${r.seq}`,
        title: plain(r.title),
        addr: '',
        place: plain(r.place),
        city: r.sigungu || cityOfCoord(lat, lng) || '제주시',
        area: '', // 목록에는 주소가 없어 읍·면을 알 수 없다
        ...typeOf(r.serviceName, r.realmName),
        image: httpsUrl(r.thumbnail),
        lng,
        lat,
        tel: '',
        start: r.startDate,
        end: r.endDate,
        source: 'culture',
      }
    })
  cache.set(year, { at: Date.now(), list })
  return list
}

// 한 건의 상세 (seq = 'cul-' 뒤의 번호)
export async function getCultureDetail(seq) {
  const [r] = await call('detail2', { seq })
  if (!r) throw new Error('공연·전시 정보를 찾을 수 없어요')
  const lat = Number(r.gpsY)
  const lng = Number(r.gpsX)
  const addr = plain(r.placeAddr)
  const city = r.sigungu || cityOfCoord(lat, lng) || '제주시'
  const service = r.realmName === '전시' ? '전시' : r.realmName === '행사/축제' ? '행사/축제' : '공연'
  return {
    id: `cul-${r.seq}`,
    title: plain(r.title),
    overview: html(r.contents1),
    addr,
    city,
    area: areaOf(addr, city),
    ...typeOf(service, r.realmName),
    tel: plain(r.phone),
    homepage: /^https?:\/\//.test(plain(r.url)) ? plain(r.url) : /^https?:\/\//.test(plain(r.placeUrl)) ? plain(r.placeUrl) : '',
    image: httpsUrl(r.imgUrl),
    images: [],
    lng,
    lat,
    start: r.startDate,
    end: r.endDate,
    playtime: '',
    place: plain(r.place),
    placeInfo: '',
    fee: plain(r.price),
    age: '',
    booking: '',
    sponsor: [],
    program: '',
    subevent: '',
    source: 'culture',
  }
}
