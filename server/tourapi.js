// 한국관광공사 TourAPI(KorService2) 공통 호출
// - 키가 없거나 data.go.kr 게이트웨이가 거절한 경우를 읽을 수 있는 문장으로 던진다.
import { fetchRetry } from './http.js'
const BASE = 'https://apis.data.go.kr/B551011/KorService2'

// TourAPI 이미지 주소는 http:// 로 오는데, https 사이트(Vercel)에서는 막힐 수 있어 https 로 바꾼다
export const httpsUrl = (u) => (u ? u.replace(/^http:\/\//, 'https://') : '')

export async function tourCall(op, params = {}) {
  const key = process.env.DATA_GO_KR_KEY
  if (!key) throw new Error('DATA_GO_KR_KEY 환경변수가 없어요 (.env.local 또는 Vercel Environment Variables)')

  const qs = new URLSearchParams({
    serviceKey: key, // ★ Decoding 키
    MobileOS: 'ETC',
    MobileApp: 'JejuFesta',
    _type: 'json',
    pageNo: '1',
    ...params,
  })
  const r = await fetchRetry(`${BASE}/${op}?${qs}`)
  const text = await r.text()
  let data
  try { data = JSON.parse(text) }
  catch { throw new Error('TourAPI 응답이 JSON이 아님: ' + text.slice(0, 120)) }

  // 키가 틀렸거나 활용신청이 안 된 경우 게이트웨이가 다른 모양으로 답한다
  const gw = data?.OpenAPI_ServiceResponse?.cmmMsgHeader
  if (gw) throw new Error(`TourAPI 인증 오류: ${gw.returnAuthMsg ?? gw.errMsg} (${gw.returnReasonCode})`)

  const header = data?.response?.header
  if (header?.resultCode !== '0000') throw new Error(`TourAPI 오류 ${header?.resultCode}: ${header?.resultMsg}`)

  const item = data.response.body?.items?.item
  return !item ? [] : Array.isArray(item) ? item : [item]
}
