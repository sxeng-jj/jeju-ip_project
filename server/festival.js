// 한국관광공사 TourAPI 행사정보 (searchFestival2)
// 주의: 지역은 areaCode=39 가 아니라 lDongRegnCd=50 (법정동 제주) 으로 걸어야 결과가 나온다.
import { httpsUrl, tourCall } from './tourapi.js'

const kstYear = () => new Date(Date.now() + 9 * 3600e3).getUTCFullYear()

// year 해 1월 1일 이후에 시작하거나 걸쳐 있는 제주 행사 (날짜는 'YYYYMMDD' 문자열)
export async function searchFestivals({ year = kstYear(), rows = 100 } = {}) {
  const list = await tourCall('searchFestival2', {
    numOfRows: String(rows),
    lDongRegnCd: '50',
    eventStartDate: `${year}0101`,
  })
  return list
    .map((f) => ({
      id: f.contentid,
      title: f.title,
      addr: f.addr1,
      image: httpsUrl(f.firstimage),
      lng: Number(f.mapx),
      lat: Number(f.mapy),
      tel: f.tel,
      start: f.eventstartdate,
      end: f.eventenddate,
    }))
    .sort((a, b) => a.start.localeCompare(b.start))
}
