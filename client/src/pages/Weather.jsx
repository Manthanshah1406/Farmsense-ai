import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import api from '../api/apiClient'

// ── Weather icon logic ────────────────────────
const wxIcon = (rain = 0, tmax = 0, humidity = 0) => {
  if (rain > 20)     return '🌧️'
  if (rain > 5)      return '🌦️'
  if (humidity > 85) return '🌫️'
  if (tmax > 42)     return '🌡️'
  if (tmax > 35)     return '☀️'
  if (tmax > 25)     return '🌤️'
  return '⛅'
}

const wxLabel = (rain = 0, tmax = 0, humidity = 0) => {
  if (rain > 20)     return 'Heavy Rain'
  if (rain > 5)      return 'Light Rain'
  if (humidity > 85) return 'Foggy / Humid'
  if (tmax > 42)     return 'Extreme Heat'
  if (tmax > 35)     return 'Sunny & Hot'
  if (tmax > 25)     return 'Partly Cloudy'
  return 'Mild'
}

// ── Severity badge for alerts ─────────────────
const severityClass = {
  critical: 'bg-red-100 text-red-700 border border-red-200',
  warning:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
  positive: 'bg-green-100 text-green-700 border border-green-200',
}
const severityIcon = { critical: '🚨', warning: '⚠️', positive: '✅' }

export default function Weather() {
  const navigate          = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(0)   // selected day index

  useEffect(() => {
    api.get('/api/weather/forecast')
      .then(res => setData(res.data))
      .catch(err => {
        const msg = err.response?.data?.error || 'Failed to load weather data.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  const days    = data?.weather?.daily || []
  const alerts  = data?.weather_alerts || []
  const loc     = data?.location || {}
  const sel     = days[selected] || null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">

          {/* Header */}
          <div className="mb-6">
            <h1 className="font-heading font-bold text-2xl text-gray-900">🌤 Weather Forecast</h1>
            <p className="text-sm text-gray-500 font-body mt-0.5">
              {loc.district && loc.state
                ? `${loc.district}, ${loc.state} · ${loc.latitude?.toFixed(2)}°N ${loc.longitude?.toFixed(2)}°E`
                : 'Loading location…'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 font-body text-sm">
              {error}
              <button onClick={() => navigate('/farm-profile')} className="ml-2 underline">
                Update farm location
              </button>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <div className="card h-40 animate-pulse bg-gray-50" />
              <div className="grid grid-cols-7 gap-2">
                {[...Array(7)].map((_, i) => <div key={i} className="card h-28 animate-pulse bg-gray-50" />)}
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Today summary hero */}
              {sel && (
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-6 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="text-7xl">{wxIcon(sel.rainfall_mm, sel.temp_max, sel.humidity)}</div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm text-gray-500 font-body">
                      {selected === 0 ? 'Today' : new Date(sel.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="font-heading font-bold text-3xl text-gray-900">
                      {sel.temp_max}° <span className="text-gray-400 text-xl font-normal">/ {sel.temp_min}°C</span>
                    </p>
                    <p className="text-gray-600 font-body mt-1">{wxLabel(sel.rainfall_mm, sel.temp_max, sel.humidity)}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {[
                        { icon: '💧', label: 'Rainfall',   value: `${sel.rainfall_mm ?? 0} mm` },
                        { icon: '💨', label: 'Wind',       value: `${sel.wind_kmh ?? 0} km/h` },
                        { icon: '🌊', label: 'Humidity',   value: `${sel.humidity ?? 0}%` },
                        { icon: '🌿', label: 'Evapotrans', value: `${sel.et0?.toFixed(1) ?? '—'} mm` },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="bg-white/60 rounded-xl px-3 py-2 text-center">
                          <p className="text-lg">{icon}</p>
                          <p className="text-[11px] text-gray-400 font-body">{label}</p>
                          <p className="text-sm font-semibold text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 16-day day picker */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                {days.map((d, i) => {
                  const label = i === 0 ? 'Today'
                    : i === 1 ? 'Tomorrow'
                    : new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
                  const isActive = selected === i
                  return (
                    <button
                      key={d.date}
                      onClick={() => setSelected(i)}
                      className={`shrink-0 flex flex-col items-center gap-1 rounded-2xl px-3 py-2.5 min-w-[64px] transition-all
                        ${isActive
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                        }`}
                    >
                      <p className={`text-[10px] font-medium ${isActive ? 'text-white/80' : 'text-gray-400'}`}>{label}</p>
                      <span className="text-xl leading-none" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' }}>
                        {wxIcon(d.rainfall_mm, d.temp_max, d.humidity)}
                      </span>
                      <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-800'}`}>{d.temp_max}°</p>
                      {d.rainfall_mm > 0 && (
                        <p className={`text-[9px] ${isActive ? 'text-white/70' : 'text-blue-400'}`}>
                          {d.rainfall_mm}mm
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Weather alerts */}
              {alerts.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-heading font-semibold text-gray-800 mb-3">
                    ⚡ Weather Alerts ({alerts.length})
                  </h2>
                  <div className="space-y-3">
                    {alerts.map((alert, i) => (
                      <div key={alert.id || alert.title || i} className={`rounded-2xl p-4 flex gap-3 ${severityClass[alert.severity] || severityClass.warning}`}>
                        <span className="text-xl shrink-0">{severityIcon[alert.severity] || '⚠️'}</span>
                        <div>
                          <p className="font-semibold text-sm">{alert.title}</p>
                          <p className="text-sm mt-0.5 opacity-90">{alert.message}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(alert.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7-day summary table */}
              <div>
                <h2 className="font-heading font-semibold text-gray-800 mb-3">📅 Full Forecast</h2>
                <div className="card overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-xs text-gray-400 font-body uppercase">Day</th>
                        <th className="px-4 py-3 text-xs text-gray-400 font-body uppercase">Condition</th>
                        <th className="px-4 py-3 text-xs text-gray-400 font-body uppercase text-right">High</th>
                        <th className="px-4 py-3 text-xs text-gray-400 font-body uppercase text-right">Low</th>
                        <th className="px-4 py-3 text-xs text-gray-400 font-body uppercase text-right">Rain</th>
                        <th className="px-4 py-3 text-xs text-gray-400 font-body uppercase text-right">Humidity</th>
                        <th className="px-4 py-3 text-xs text-gray-400 font-body uppercase text-right">Wind</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d, i) => (
                        <tr
                          key={d.date}
                          onClick={() => setSelected(i)}
                          className={`border-t border-gray-50 cursor-pointer transition-colors
                            ${selected === i ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {i === 0 ? 'Today'
                              : i === 1 ? 'Tomorrow'
                              : new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-body">
                            <span className="mr-1" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' }}>
                              {wxIcon(d.rainfall_mm, d.temp_max, d.humidity)}
                            </span>
                            {wxLabel(d.rainfall_mm, d.temp_max, d.humidity)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-600">{d.temp_max}°C</td>
                          <td className="px-4 py-3 text-right text-blue-500">{d.temp_min}°C</td>
                          <td className="px-4 py-3 text-right text-blue-400">{d.rainfall_mm ?? 0} mm</td>
                          <td className="px-4 py-3 text-right text-gray-500">{d.humidity ?? 0}%</td>
                          <td className="px-4 py-3 text-right text-gray-500">{d.wind_kmh ?? 0} km/h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
