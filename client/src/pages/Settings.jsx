import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import api from '../api/apiClient'
import { useAuth } from '../context/AuthContext'
import { updatePhone } from '../api/authApi'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [prefs, setPrefs]       = useState({ email_alerts: true, sms_alerts: false, alert_types: ['heavy_rain', 'heatwave', 'drought_risk', 'frost_risk', 'strong_wind', 'fungal_risk', 'good_sowing_window', 'irrigation_needed'] })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)

  const hasPhone = Boolean(user?.phone && user.phone.trim() !== '' && user.phone !== '0000000000' && !user.phone.startsWith('G'))

  useEffect(() => {
    api.get('/api/notifications/prefs')
      .then((res) => {
        const fetchedPrefs = res.data.prefs || prefs
        if (!hasPhone) {
          fetchedPrefs.sms_alerts = false
        }
        setPrefs(fetchedPrefs)
      })
      .catch(() => {}) // Use defaults if not set yet
      .finally(() => setLoading(false))
  }, [hasPhone])

  const toggle = (key) => {
    if (key === 'sms_alerts' && !hasPhone) {
      setEditingPhone(true)
      return
    }
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  const toggleType = (type) => {
    setPrefs((p) => ({
      ...p,
      alert_types: p.alert_types.includes(type)
        ? p.alert_types.filter((t) => t !== type)
        : [...p.alert_types, type],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const payload = { ...prefs }
      if (!hasPhone) payload.sms_alerts = false
      await api.put('/api/notifications/prefs', payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePhone = async () => {
    if (!phoneInput.trim()) return
    setSavingPhone(true)
    try {
      await updatePhone({ phone: phoneInput })
      updateUser({ phone: phoneInput })
      setEditingPhone(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update phone')
    } finally {
      setSavingPhone(false)
    }
  }

  const ALERT_TYPES = [
    { key: 'heavy_rain',         label: 'Heavy Rain Alerts',      icon: '🌧️' },
    { key: 'heatwave',           label: 'Heatwave Alerts',        icon: '🔥' },
    { key: 'drought_risk',       label: 'Drought Risk Alerts',    icon: '🏜️' },
    { key: 'frost_risk',         label: 'Frost Risk Alerts',      icon: '❄️' },
    { key: 'strong_wind',        label: 'Strong Wind Alerts',     icon: '💨' },
    { key: 'fungal_risk',        label: 'Fungal Disease Alerts',  icon: '🍄' },
    { key: 'good_sowing_window', label: 'Good Sowing Window',     icon: '🌱' },
    { key: 'irrigation_needed',  label: 'Irrigation Needed',      icon: '💧' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="font-heading font-bold text-2xl text-gray-900">⚙️ Settings</h1>
            <p className="text-sm text-gray-500 font-body mt-1">Manage your notification preferences</p>
          </div>

          {/* Account info */}
          <div className="card mb-5">
            <h2 className="font-heading font-semibold text-gray-800 mb-3">Account</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-body">Name</span>
                <span className="text-sm font-medium text-gray-800 font-body">{user?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-body">Email</span>
                <span className="text-sm font-medium text-gray-800 font-body">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-body">Phone</span>
                {editingPhone ? (
                  <div className="flex items-center gap-3">
                    <input 
                      type="tel"
                      className="input-field py-1 px-2 text-sm max-w-[150px]" 
                      value={phoneInput} 
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Phone number"
                      autoFocus
                    />
                    <button onClick={handleSavePhone} disabled={savingPhone} className="text-primary text-sm font-medium hover:underline">
                      {savingPhone ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditingPhone(false)} className="text-gray-400 text-sm hover:underline">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800 font-body">{!hasPhone ? 'Not set' : user?.phone}</span>
                    <button 
                      onClick={() => { setEditingPhone(true); setPhoneInput(!hasPhone ? '' : user?.phone); }} 
                      className="text-xs text-primary hover:underline bg-primary/10 px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notification channels */}
          <div className="card mb-5">
            <h2 className="font-heading font-semibold text-gray-800 mb-4">Notification Channels</h2>
            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-12 animate-pulse bg-gray-50 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-background">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📧</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 font-body">Email Notifications</p>
                      <p className="text-xs text-gray-400 font-body">Alerts sent to {user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle('email_alerts')}
                    id="toggle-email_alerts"
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${prefs.email_alerts ? 'bg-primary' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${prefs.email_alerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-background">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📱</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 font-body">SMS Notifications</p>
                      <p className="text-xs text-gray-400 font-body">
                        {hasPhone ? (
                          `Alerts sent to ${user?.phone}`
                        ) : (
                          <span className="text-amber-600 font-medium">
                            Phone required — <button onClick={() => { setEditingPhone(true); setPhoneInput(''); }} className="underline hover:text-amber-700">Add Phone Number</button>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle('sms_alerts')}
                    id="toggle-sms_alerts"
                    disabled={!hasPhone}
                    title={!hasPhone ? 'Please add a phone number first to enable SMS notifications' : ''}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200
                      ${prefs.sms_alerts && hasPhone ? 'bg-primary' : 'bg-gray-300'}
                      ${!hasPhone ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${prefs.sms_alerts && hasPhone ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Alert types */}
          <div className="card mb-6">
            <h2 className="font-heading font-semibold text-gray-800 mb-4">Alert Types</h2>
            <div className="space-y-2">
              {ALERT_TYPES.map(({ key, label, icon }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-background cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    id={`alert-type-${key}`}
                    checked={prefs.alert_types.includes(key)}
                    onChange={() => toggleType(key)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-body text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={saving} id="btn-save-settings" className="btn-primary">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            {saved && (
              <span className="text-sm text-secondary font-body animate-fade-in">
                ✓ Settings saved!
              </span>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
