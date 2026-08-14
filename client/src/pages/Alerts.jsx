import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import AlertCard from '../components/AlertCard'
import { useAuth } from '../context/AuthContext'
import { getAlerts, getAlertHistory, generateDemoAlerts } from '../api/alertApi'
import { getMyFarm } from '../api/farmApi'
import { MOCK_ALERTS, MOCK_HISTORY_ALERTS } from '../mock/mockData'

const TABS = ['Active', 'History']

export default function Alerts() {
  const { isDemo }            = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tab, setTab]         = useState('Active')
  const [alerts, setAlerts]   = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoMsg, setDemoMsg]         = useState('')

  useEffect(() => {
    if (isDemo) {
      setAlerts(MOCK_ALERTS)
      setHistory(MOCK_HISTORY_ALERTS)
      setLoading(false)
      return
    }
    getMyFarm()
      .then((res) => {
        const farmId = res.data.farm?.id
        return Promise.all([getAlerts(farmId), getAlertHistory()])
      })
      .then(([activeRes, histRes]) => {
        setAlerts(activeRes.data.alerts || [])
        setHistory(histRes.data.alerts || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isDemo])

  const handleGenerateDemo = async () => {
    setDemoLoading(true)
    setDemoMsg('')
    try {
      await generateDemoAlerts()
      // Refresh alerts
      const farm = await getMyFarm()
      const farmId = farm.data.farm?.id
      const [activeRes, histRes] = await Promise.all([getAlerts(farmId), getAlertHistory()])
      setAlerts(activeRes.data.alerts || [])
      setHistory(histRes.data.alerts || [])
      setTab('Active')
      setDemoMsg('✅ 3 demo alerts created!')
    } catch (err) {
      setDemoMsg('❌ ' + (err.response?.data?.error || 'Failed. Make sure your farm profile is set up.'))
    } finally {
      setDemoLoading(false)
    }
  }

  const displayed = tab === 'Active' ? alerts : history

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <p className="text-xs text-amber-700 font-body">🧪 <strong>Demo Mode</strong> — sample alerts shown</p>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-2xl text-gray-900">🔔 Alerts</h1>
              <p className="text-sm text-gray-500 font-body mt-1">Weather and farming alerts for your crops</p>
            </div>
            {!isDemo && (
              <div className="flex flex-col items-start sm:items-end gap-1">
                <button
                  onClick={handleGenerateDemo}
                  disabled={demoLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-sm font-medium hover:bg-amber-200 transition-all disabled:opacity-50"
                >
                  {demoLoading ? (
                    <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  ) : '🧪'}
                  {demoLoading ? 'Generating...' : 'Generate Demo Alerts'}
                </button>
                {demoMsg && <p className="text-xs text-gray-500 font-body">{demoMsg}</p>}
              </div>
            )}
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all font-body
                  ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t}
                {t === 'Active' && alerts.filter((a) => !a.is_read).length > 0 && (
                  <span className="ml-2 bg-danger text-white text-[10px] rounded-full px-1.5 py-0.5">
                    {alerts.filter((a) => !a.is_read).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}
            </div>
          ) : displayed.length ? (
            <div className="space-y-3">
              {displayed.map((alert) => (
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
            <div className="card text-center py-16">
              <span className="text-5xl">{tab === 'Active' ? '✅' : '📭'}</span>
              <h3 className="font-heading font-semibold text-gray-700 mt-4">
                {tab === 'Active' ? 'No Active Alerts' : 'No Alert History'}
              </h3>
              <p className="text-sm text-gray-500 font-body mt-1">
                {tab === 'Active' ? 'Your crops are safe right now.' : 'No past alerts yet.'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
