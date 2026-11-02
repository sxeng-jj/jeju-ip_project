// 한국관광공사 TourAPI 행사정보 (KorService2 / searchFestival2)
// 주의: 지역은 areaCode=39 가 아니라 lDongRegnCd=50 (법정동 제주) 으로 걸어야 결과가 나온다.
const BASE = 'https://apis.data.go.kr/B551011/KorService2'

const kstYear = () => new Date(Date.now() + 9 * 3600e3).getUTCFullYear()

// year 해 1월 1일 이후에 시작하거나 걸쳐 있는 제주 행사 (YYYYMMDD 문자열로 정리해서 반환)
export async function searchFestivals({ year = kstYear(), rows = 100 } = {}) {
  const params = new URLSearchParams({
    serviceKey: process.env.DATA_GO_KR_KEY, // ★ Decoding 키
    MobileOS: 'ETC',
    MobileApp: 'JejuFesta',
    _type: 'json',
    numOfRows: String(rows),
    pageNo: '1',
    lDongRegnCd: '50',
    eventStartDate: `${year}0101`,
  })

  const r = await fetch(`${BASE}/searchFestival2?${params}`)
  const text = await r.text()
  let data
  try { data = JSON.parse(text) }
  catch { throw new Error('TourAPI 응답이 JSON이 아님: ' + text.slice(0, 120)) }

  const header = data?.response?.header
  if (header?.resultCode !== '0000') throw new Error(`TourAPI 오류 ${header?.resultCode}: ${header?.resultMsg}`)

  const item = data?.response?.body?.items?.item
  const list = !item ? [] : Array.isArray(item) ? item : [item]
  return list
    .map((f) => ({
      id: f.contentid,
      title: f.title,
      addr: f.addr1,
      image: f.firstimage,
      lng: Number(f.mapx),
      lat: Number(f.mapy),
      tel: f.tel,
      start: f.eventstartdate, // 'YYYYMMDD'
      end: f.eventenddate,
    }))
    .sort((a, b) => a.start.localeCompare(b.start))
}
