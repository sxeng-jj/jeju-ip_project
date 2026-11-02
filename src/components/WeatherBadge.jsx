import { weatherIcon } from '../lib/weather'
import { fmtYmd } from '../lib/date'

// 하루 예보 한 줄: 아이콘 · 기온 · 강수확률
export default function WeatherBadge({ w, showDate = false }) {
  return (
    <span className="small">
      <i className={`bi bi-${weatherIcon(w)} me-1`} />
      {showDate && <>{fmtYmd(w.date).slice(5)} </>}
      {w.sky} {w.min}~{w.max}°C · 강수 {w.pop}%
    </span>
  )
}
