// 화면이 우리 서버 함수(/api/...)를 부를 때 쓰는 함수 모음
// 공공데이터 API는 브라우저에서 직접 부르지 않고 반드시 /api 를 거칩니다 (키 노출 + CORS).

async function readJson(r) {
  let data
  try { data = await r.json() }
  catch { throw new Error(`서버 응답이 JSON이 아님 (${r.status}) — vercel dev 로 실행했는지 확인`) }
  if (!r.ok) throw new Error(data.error || r.statusText)
  return data
}

export const get = async (path) => readJson(await fetch(path))

export const post = async (path, body) =>
  readJson(await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))

// 동작 확인용
export const ping = () => get('/api/hello')

// 공공데이터 API
export const fetchFestivals = (year) => get(`/api/festivals${year ? `?year=${year}` : ''}`)
export const fetchFestival = (id) => get(`/api/festival?id=${encodeURIComponent(id)}`)
export const fetchWeather = (place = '제주시') => get(`/api/weather?place=${encodeURIComponent(place)}`)
export const fetchHeritage = (keyword = '', kind = '') =>
  get(`/api/heritage?keyword=${encodeURIComponent(keyword)}&kind=${encodeURIComponent(kind)}`)
export const fetchHeritageKinds = () => get('/api/heritage?kinds=1')
