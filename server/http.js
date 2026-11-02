// 외부 공공 API 호출용 fetch: 일시적인 네트워크 오류·서버 오류(5xx)는 몇 번 다시 시도한다
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function fetchRetry(url, { tries = 3, delay = 400, timeout = 15000 } = {}) {
  let last
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeout) })
      if (r.status < 500 || i === tries - 1) return r
      last = new Error(`HTTP ${r.status}`)
    } catch (e) {
      last = e
    }
    if (i < tries - 1) await sleep(delay * (i + 1))
  }
  const reason = last?.cause?.code ?? last?.name ?? last?.message
  throw new Error(`공공데이터 서버에 연결하지 못했어요 (${reason}). 잠시 후 다시 시도해 주세요`)
}
