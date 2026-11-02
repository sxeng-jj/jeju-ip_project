// 한국관광공사 TourAPI 행사정보 (searchFestival2 + 상세 3종)
// 주의: 지역은 areaCode=39 가 아니라 lDongRegnCd=50 (법정동 제주) 으로 걸어야 결과가 나온다.
import { httpsUrl, tourCall } from './tourapi.js'

const kstYear = () => new Date(Date.now() + 9 * 3600e3).getUTCFullYear()
const SIGUNGU = { 110: '제주시', 130: '서귀포시' } // ldongCode2 로 확인한 코드

// 주소 → 읍·면 이름 (동 지역은 '시내'로 묶는다)  예) '제주특별자치도 제주시 애월읍 …' → '애월읍'
function areaOf(addr = '', city) {
  const m = addr.match(/(?:제주시|서귀포시)\s+(\S+)/)
  const token = m?.[1] ?? ''
  return /[읍면]$/.test(token) ? token : `${city} 시내`
}

// year 해 1월 1일 이후까지 이어지는 제주 행사 (날짜는 'YYYYMMDD' 문자열)
export async function searchFestivals({ year = kstYear(), rows = 100 } = {}) {
  const list = await tourCall('searchFestival2', {
    numOfRows: String(rows),
    lDongRegnCd: '50',
    eventStartDate: `${year}0101`,
  })
  return list
    .map((f) => {
      const city = SIGUNGU[f.lDongSignguCd] ?? '제주시'
      return {
        id: f.contentid,
        title: f.title,
        addr: f.addr1,
        city, // 제주시 | 서귀포시
        area: areaOf(f.addr1, city), // 읍·면 또는 'OO시 시내'
        lcls: f.lclsSystm3, // 유형 분류 코드 (이름표는 src/lib/festivalMeta.js)
        image: httpsUrl(f.firstimage),
        lng: Number(f.mapx),
        lat: Number(f.mapy),
        tel: f.tel,
        start: f.eventstartdate,
        end: f.eventenddate,
      }
    })
    .sort((a, b) => a.start.localeCompare(b.start))
}

// TourAPI 본문은 <br>, <a> 같은 HTML 이 섞여 있어 글자만 남긴다
const text = (s = '') =>
  s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
const link = (s = '') => {
  const href = s.match(/href="([^"]+)"/)?.[1]
  const url = href ?? text(s)
  return /^https?:\/\//.test(url) ? url : ''
}
const pick = (o, ...keys) => keys.map((k) => text(o?.[k])).find(Boolean) ?? ''

// 한 행사의 상세정보: 소개글·주최·문의·시간·장소·요금·프로그램·이미지
export async function getFestivalDetail(id) {
  if (!/^\d+$/.test(String(id))) throw new Error('올바르지 않은 id 예요')
  const [[common], [intro], images] = await Promise.all([
    tourCall('detailCommon2', { contentId: id }),
    tourCall('detailIntro2', { contentId: id, contentTypeId: '15' }),
    tourCall('detailImage2', { contentId: id, imageYN: 'Y', numOfRows: '12' }).catch(() => []),
  ])
  if (!common) throw new Error('행사를 찾을 수 없어요')

  const city = SIGUNGU[common.lDongSignguCd] ?? '제주시'
  const addr = [common.addr1, common.addr2].filter(Boolean).join(' ')
  return {
    id,
    title: common.title,
    overview: text(common.overview),
    addr,
    city,
    area: areaOf(common.addr1, city),
    lcls: common.lclsSystm3,
    tel: common.tel,
    homepage: link(intro?.eventhomepage) || link(common.homepage),
    image: httpsUrl(common.firstimage),
    images: images.map((i) => httpsUrl(i.originimgurl)).filter(Boolean),
    lng: Number(common.mapx),
    lat: Number(common.mapy),
    start: intro?.eventstartdate ?? '',
    end: intro?.eventenddate ?? '',
    playtime: text(intro?.playtime),
    place: pick(intro, 'eventplace'),
    placeInfo: pick(intro, 'placeinfo'),
    fee: pick(intro, 'usetimefestival'),
    age: pick(intro, 'agelimit'),
    booking: pick(intro, 'bookingplace'),
    sponsor: [
      [text(intro?.sponsor1), text(intro?.sponsor1tel)],
      [text(intro?.sponsor2), text(intro?.sponsor2tel)],
    ].filter(([name]) => name),
    program: text(intro?.program),
    subevent: text(intro?.subevent),
  }
}
