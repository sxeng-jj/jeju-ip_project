// 기상청 단기예보 조회서비스 (VilageFcstInfoService_2.0 / getVilageFcst)
const BASE = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
const GRID = { 제주시: [53, 38], 서귀포시: [52, 33] } // 기상청 격자 좌표(nx, ny)
const SKY = { 1: '맑음', 3: '구름많음', 4: '흐림' }
const PTY = { 0: '없음', 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' }

// 발표시각: 02·05·08·11·14·17·20·23시 (발표 약 10분 뒤부터 조회 가능)
function baseDateTime() {
  const kst = new Date(Date.now() + 9 * 3600e3 - 15 * 60e3) // 한국시간, 15분 여유
  const h = [23, 20, 17, 14, 11, 8, 5, 2].find((x) => x <= kst.getUTCHours())
  const day = h === undefined ? new Date(kst.getTime() - 24 * 3600e3) : kst
  return {
    base_date: day.toISOString().slice(0, 10).replaceAll('-', ''),
    base_time: String(h ?? 23).padStart(2, '0') + '00',
  }
}

// 시간대별 예보를 날짜별 요약으로 묶는다 (약 3일치)
// 반환: [{ place, date:'YYYYMMDD', min, max, pop, sky, rain }]
export async function getWeather({ place = '제주시' } = {}) {
  const [nx, ny] = GRID[place] ?? GRID['제주시']
  if (!process.env.DATA_GO_KR_KEY) throw new Error('DATA_GO_KR_KEY 환경변수가 없어요 (.env.local 또는 Vercel Environment Variables)')
  const params = new URLSearchParams({
    serviceKey: process.env.DATA_GO_KR_KEY,
    dataType: 'JSON',
    numOfRows: '1000',
    pageNo: '1',
    nx: String(nx),
    ny: String(ny),
    ...baseDateTime(),
  })
  const r = await fetch(`${BASE}?${params}`)
  const text = await r.text()
  let data
  try { data = JSON.parse(text) }
  catch { throw new Error('기상청 응답이 JSON이 아님: ' + text.slice(0, 120)) }

  const gw = data?.OpenAPI_ServiceResponse?.cmmMsgHeader
  if (gw) throw new Error(`기상청 인증 오류: ${gw.returnAuthMsg ?? gw.errMsg} (${gw.returnReasonCode})`)

  const header = data?.response?.header
  if (header?.resultCode !== '00') throw new Error(`기상청 오류 ${header?.resultCode}: ${header?.resultMsg}`)

  const items = data?.response?.body?.items?.item ?? []
  const days = {}
  for (const it of items) {
    const d = (days[it.fcstDate] ??= { temps: [], pops: [], skies: [], daySkies: [], ptys: [] })
    const v = Number(it.fcstValue)
    if (it.category === 'TMP') d.temps.push(v)
    if (it.category === 'POP') d.pops.push(v)
    if (it.category === 'SKY') {
      d.skies.push(v)
      if (it.fcstTime >= '0900' && it.fcstTime <= '1800') d.daySkies.push(v)
    }
    if (it.category === 'PTY') d.ptys.push(v)
  }

  const worst = (arr) => (arr.length ? Math.max(...arr) : undefined)
  return Object.entries(days).map(([date, d]) => ({
    place,
    date,
    min: Math.min(...d.temps),
    max: Math.max(...d.temps),
    pop: worst(d.pops) ?? 0, // 하루 중 최대 강수확률(%)
    // 낮(9~18시) 하늘 기준, 낮 데이터가 없는 날(예보 마지막 날)은 있는 값으로 대체
    sky: SKY[worst(d.daySkies.length ? d.daySkies : d.skies)] ?? '정보없음',
    rain: PTY[worst(d.ptys) ?? 0] ?? '없음',
  }))
}
