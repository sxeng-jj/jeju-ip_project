// 비용 보호: 같은 접속 주소에서 windowMs 동안 limit 번까지만 (서버가 꺼졌다 켜지면 초기화되는 간단한 제한)
export function makeLimiter(limit, windowMs = 10 * 60e3) {
  const hits = new Map()
  return (ip) => {
    const now = Date.now()
    const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
    list.push(now)
    hits.set(ip, list)
    return list.length > limit
  }
}

export const clientIp = (req) => String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'local').split(',')[0].trim()
