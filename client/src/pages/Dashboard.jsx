import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import WeatherWidget from '../components/WeatherWidget'
import AlertCard from '../components/AlertCard'
import SuggestionCard from '../components/SuggestionCard'
import AnalysisCard from '../components/AnalysisCard'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { getMyFarm } from '../api/farmApi'
import { getWeatherForecast } from '../api/weatherApi'
import { getAlerts } from '../api/alertApi'
import { getSuggestions } from '../api/suggestionApi'
import { runAIAnalysis, getLatestAnalysis } from '../api/analysisApi'
import {
  MOCK_ALERTS, MOCK_FARM, MOCK_SUGGESTIONS
} from '../mock/mockData'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, isDemo } = useAuth()
  const { liveAlerts, dismissAlert } = useSocket() || {}
  const [farm, setFarm]             = useState(null)
  const [farmStats, setFarmStats]   = useState(null)
  const [forecast, setForecast]     = useState([])
  const [alerts, setAlerts]         = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [latestAnalysis, setLatestAnalysis] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const [analysisError, setAnalysisError]     = useState('')

  useEffect(() => {
    if (isDemo) {
      // Use mock data instantly
      setFarm(MOCK_FARM)
      setForecast(MOCK_WEATHER)
      setAlerts(MOCK_ALERTS)
      setSuggestions(MOCK_SUGGESTIONS)
      setLoading(false)
      return
    }

    // Real API
    getMyFarm()
      .then((res) => {
        setFarm(res.data.farm)
        setFarmStats(res.data.stats)
        const id = res.data.farm?.id
        return Promise.all([
          getWeatherForecast(),
          getAlerts(id),
          getSuggestions(id),
          getLatestAnalysis(),
        ])
      })
      .then(([w, a, s, an]) => {
        setForecast(w.data.weather?.daily || [])
        setAlerts(a.data.alerts || [])
        setSuggestions(s.data.suggestions || [])
        if (an.data.has_analysis) setLatestAnalysis(an.data.analysis)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isDemo])

  const handleRunAnalysis = async () => {
    setAnalysisError('')
    try {
      setRunningAnalysis(true)
      await runAIAnalysis()
      
      // Fetch fresh data seamlessly instead of full page reload
      const id = farm?.id
      const [a, s, an] = await Promise.all([
        getAlerts(id),
        getSuggestions(id),
        getLatestAnalysis(),
      ])
      
      setAlerts(a.data.alerts || [])
      setSuggestions(s.data.suggestions || [])
      if (an.data.has_analysis) setLatestAnalysis(an.data.analysis)
      
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to run AI analysis'
      setAnalysisError(msg)
    } finally {
      setRunningAnalysis(false)
    }
  }

  const unreadAlerts   = alerts.filter((a) => !a.is_read).length
  const profileComplete = farm && (farm.profile_completed ?? user?.profile_completed)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        {/* Demo mode banner */}
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
            <span className="text-sm">🧪</span>
            <p className="text-xs text-amber-800 font-body">
              <strong>Demo Mode</strong> — showing sample data for Ramesh Patel&apos;s farm in Anand, Gujarat.
              Connect the Node.js backend to use real data.
            </p>
          </div>
        )}

        {/* Analysis error banner */}
        {analysisError && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <p className="text-sm text-red-700 font-body">
                {analysisError}
                {analysisError.toLowerCase().includes('soil') && (
                  <a href="/farm-profile" className="ml-2 underline font-semibold">
                    Update Soil Profile →
                  </a>
                )}
              </p>
            </div>
            <button onClick={() => setAnalysisError('')} className="text-red-400 hover:text-red-600 text-lg ml-4">×</button>
          </div>
        )}

        {/* ── Profile incomplete banner ── */}
        {!isDemo && !loading && !profileComplete && (
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20 px-4 py-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🌾</span>
                <div>
                  <p className="font-semibold text-gray-900 font-body">Complete your farm setup</p>
                  <p className="text-sm text-gray-600 font-body">
                    Set up your farm profile to unlock AI analysis, weather alerts, crop suggestions and more.
                  </p>
                </div>
              </div>
              <a
                href="/farm-profile"
                className="btn-primary text-sm whitespace-nowrap shrink-0"
              >
                Update Farm Profile →
              </a>
            </div>
          </div>
        )}

        {/* Live alert popup */}
        {liveAlerts?.length > 0 && (
          <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
            {liveAlerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-2xl shadow-xl border border-danger/20 p-4 animate-slide-up flex items-start gap-3">
                <span className="text-xl">🚨</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 font-body">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Real-time alert</p>
                </div>
                <button onClick={() => dismissAlert(alert.id)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>
            ))}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-heading font-bold text-2xl text-gray-900">
                {t('dashboard.title')}
              </h1>
              <p className="text-sm text-gray-500 font-body mt-1">
                {t('dashboard.subtitle')}
              </p>
            </div>
            {!isDemo && !loading && profileComplete && (
              <button
                onClick={handleRunAnalysis}
                disabled={runningAnalysis}
                className="btn-primary flex items-center gap-2"
              >
                {runningAnalysis ? 'Running...' : '🤖 Run AI Analysis'}
              </button>
            )}
          </div>

          {/* If profile not complete — show placeholder cards */}
          {!isDemo && !loading && !profileComplete ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 opacity-40 pointer-events-none select-none">
              <StatCard title="Active Alerts"  value="—" icon="🔔" color="danger"    />
              <StatCard title="AI Suggestions" value="—" icon="💡" color="secondary" />
              <StatCard title="Total Area"     value="—" icon="🚜" color="primary"   />
              <StatCard title="Fields"         value="—" icon="🌱" color="info"      />
            </div>
          ) : (
            /* Stat cards */
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard title="Active Alerts"   value={loading ? '—' : unreadAlerts}                              icon="🔔" color="danger"    />
              <StatCard title="AI Suggestions"  value={loading ? '—' : suggestions.length}                        icon="💡" color="secondary" />
              <StatCard title="Total Area"      value={loading ? '—' : `${farm?.farm_area || 0}ac`}               icon="🚜" color="primary"   />
              <StatCard title="Fields"          value={loading ? '—' : (farmStats?.total_fields ?? 0)}          icon="🌱" color="info"      />
            </div>
          )}

          {/* Weather */}
          <div className="mb-6">
            {loading
              ? <div className="card h-32 animate-pulse bg-gray-50" />
              : <WeatherWidget forecast={forecast} />
            }
          </div>

          {/* AI Analysis */}
          {!loading && latestAnalysis && (
            <div className="mb-6">
              <AnalysisCard analysis={latestAnalysis} />
            </div>
          )}

          {/* Bottom row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Alerts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-gray-800">{t('dashboard.recent_alerts')}</h2>
                <a href="/alerts" className="text-xs text-primary hover:underline font-body">View all →</a>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}
                </div>
              ) : alerts.length ? (
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onRead={() => setAlerts((prev) =>
                        prev.map((a) => a.id === alert.id ? { ...a, is_read: true } : a)
                      )}
                    />
                  ))}
                </div>
              ) : (
                <div className="card text-center py-10">
                  <span className="text-4xl">✅</span>
                  <p className="text-sm text-gray-500 mt-2 font-body">{t('dashboard.no_alerts')}</p>
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-gray-800">{t('dashboard.ai_suggestions')}</h2>
                <a href="/suggestions" className="text-xs text-primary hover:underline font-body">View all →</a>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}
                </div>
              ) : suggestions.length ? (
                <div className="space-y-3">
                  {suggestions.slice(0, 3).map((s) => <SuggestionCard key={s.id} suggestion={s} />)}
                </div>
              ) : (
                <div className="card text-center py-10">
                  <span className="text-4xl">🤖</span>
                  <p className="text-sm text-gray-500 mt-2 font-body">No suggestions yet.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
