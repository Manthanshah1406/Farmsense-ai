import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/apiClient'

const WX_ICON = (rain, tmax) => {
  if (rain > 15) return '🌧️'
  if (rain > 5)  return '🌦️'
  if (tmax > 40) return '🥵'
  if (tmax > 32) return '☀️'
  return '⛅'
}

export default function SidebarWeather() {
  const [days, setDays]         = useState([])
  const [today, setToday]       = useState(null)
  const [location, setLocation] = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const navigate                = useNavigate()

  useEffect(() => {
    api.get('/api/weather/forecast')
      .then(res => {
        const w = res.data.weather
        setToday(w.today)
        setDays(w.daily?.slice(0, 7) || [])
        setLocation(`${res.data.location?.district || ''}, ${res.data.location?.state || ''}`)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="px-3 py-3 border-t border-gray-100">
      <div className="h-3 w-24 bg-gray-100 rounded mb-2 animate-pulse" />
      <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )

  if (error || !today) return null

  return (
    <div
      className="border-t border-gray-100 px-3 pt-3 pb-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-b-xl"
      onClick={() => navigate('/weather')}
      title="View full forecast"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[10px] text-gray-400 font-body uppercase tracking-wide">🌤 Weather</p>
        <p className="text-[10px] text-primary font-body">View all →</p>
      </div>

      {/* Today highlight */}
      <div className="bg-primary/5 rounded-xl px-3 py-2 mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-800">Today</p>
          <p className="text-[11px] text-gray-500">
            {today.temp_min}° – {today.temp_max}°C
          </p>
          {today.rainfall_mm > 0 && (
            <p className="text-[10px] text-blue-500">💧 {today.rainfall_mm}mm</p>
          )}
        </div>
        <span className="text-3xl">{WX_ICON(today.rainfall_mm, today.temp_max)}</span>
      </div>

      {/* 7-day strip */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {days.slice(1).map((d, i) => {
          const label = new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })
          return (
            <div key={i} className="shrink-0 flex flex-col items-center gap-0.5 bg-gray-50 rounded-lg px-1.5 py-1.5 min-w-[36px]">
              <p className="text-[9px] text-gray-400">{label}</p>
              <span className="text-base">{WX_ICON(d.rainfall_mm, d.temp_max)}</span>
              <p className="text-[10px] font-bold text-gray-700">{d.temp_max}°</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
