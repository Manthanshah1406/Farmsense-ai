import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import FieldCard from '../components/FieldCard'
import { useAuth } from '../context/AuthContext'
import { getMyFarm, addField, updateField, deleteField, getFields, updateSoilProfile } from '../api/farmApi'
import { requestInspection, getMyInspections } from '../api/inspectionApi'
import { MOCK_FARM } from '../mock/mockData'

const SOIL_TYPES  = ['Black', 'Red', 'Alluvial', 'Laterite', 'Sandy', 'Loamy', 'Clayey']
const CROP_STAGES = ['sowing', 'growing', 'flowering', 'harvest']
const SEASONS     = ['kharif', 'rabi', 'zaid']

function FieldModal({ field, onClose, onSave, farmId, isDemo, maxArea }) {
  const [form, setForm]     = useState(
    field || { field_name: '', current_crop: '', field_size: '', season: 'Kharif', sow_date: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  // Sowing date bounds
  const today = new Date().toISOString().split('T')[0]
  const minSowDate = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 5)
    return d.toISOString().split('T')[0]
  })()

  const COMMON_CROPS = [
    'Cotton', 'Wheat', 'Rice', 'Maize', 'Sugarcane', 'Soybean',
    'Groundnut', 'Bajra', 'Jowar', 'Chickpea', 'Mustard', 'Other',
  ]

  const handleSave = async () => {
    if (!form.field_name?.trim()) { setError('Field name is required'); return }
    if (!form.field_size || parseFloat(form.field_size) <= 0) { setError('Enter a valid field area'); return }
    if (!field?.id && parseFloat(form.field_size) > maxArea) {
      setError(`Area cannot exceed remaining farm area (${maxArea.toFixed(1)} acres)`)
      return
    }
    setError('')
    setSaving(true)
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 600))
      } else {
        if (field?.id) await updateField(field.id, form)
        else await addField(farmId, form)
      }
      onSave()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save field.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-slide-up">
        <h3 className="font-heading font-bold text-lg text-gray-900 mb-4">
          {field?.id ? 'Edit Field' : 'Add New Field'}
          {isDemo && <span className="ml-2 text-xs text-amber-600 font-body">(Demo)</span>}
        </h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4 font-body">
            {error}
          </div>
        )}

        {!field?.id && maxArea > 0 && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl px-3 py-2 mb-4 font-body">
            Available area: <strong>{maxArea.toFixed(1)} acres</strong>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="label">Field Name</label>
            <input className="input-field" value={form.field_name || ''} onChange={(e) => set('field_name', e.target.value)} placeholder="North Field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Current Crop <span className="text-gray-400 text-xs">(optional)</span></label>
              <select className="input-field" value={form.current_crop || ''} onChange={(e) => set('current_crop', e.target.value)}>
                <option value="">-- No crop yet --</option>
                {COMMON_CROPS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Season</label>
              <select className="input-field" value={form.season || 'Kharif'} onChange={(e) => set('season', e.target.value)}>
                {['Kharif', 'Rabi', 'Zaid'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Area (acres)</label>
              <input className="input-field" type="number" min="0.1" step="0.1"
                max={!field?.id ? maxArea : undefined}
                value={form.field_size || ''} onChange={(e) => set('field_size', e.target.value)} placeholder="2.5" />
            </div>
            <div>
              <label className="label">Sowing Date <span className="text-gray-400 text-xs">(optional)</span></label>
              <input className="input-field" type="date"
                min={minSowDate}
                max={today}
                value={form.sow_date || ''}
                onChange={(e) => set('sow_date', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save Field'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SoilProfileSection({ farm, onUpdated, isDemo, onShowInspectionModal }) {
  const hasSoil = farm?.npk_nitrogen && farm?.npk_phosphorus && farm?.npk_potassium && farm?.ph_level
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({
    npk_nitrogen:   farm?.npk_nitrogen   || '',
    npk_phosphorus: farm?.npk_phosphorus || '',
    npk_potassium:  farm?.npk_potassium  || '',
    ph_level:       farm?.ph_level       || '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (form.npk_nitrogen === '' || form.npk_phosphorus === '' || form.npk_potassium === '' || form.ph_level === '') {
      setError('All four values are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateSoilProfile({
        npk_nitrogen:   parseFloat(form.npk_nitrogen),
        npk_phosphorus: parseFloat(form.npk_phosphorus),
        npk_potassium:  parseFloat(form.npk_potassium),
        ph_level:       parseFloat(form.ph_level),
      })
      setEditing(false)
      onUpdated()
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setError(data.errors.map(e => e.message).join(' | '));
      } else {
        setError(data?.error || 'Failed to save soil profile.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`card mb-6 ${!hasSoil ? 'border-2 border-amber-300' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧪</span>
          <h3 className="font-heading font-semibold text-gray-800">Soil Test Report (NPK + pH)</h3>
          {!hasSoil && (
            <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
              Required for AI
            </span>
          )}
        </div>
        {!isDemo && (
          <div className="flex gap-3">
            <button
              onClick={() => onShowInspectionModal()}
              className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md font-medium transition-colors"
            >
              📅 Request Inspection
            </button>
            <button
              onClick={() => { setEditing(e => !e); setError('') }}
              className="text-xs text-primary hover:bg-primary/5 px-2 py-1 rounded-md font-medium transition-colors"
            >
              {editing ? 'Cancel' : hasSoil ? 'Edit Manually' : 'Enter Manually'}
            </button>
          </div>
        )}
      </div>

      {/* Incomplete warning */}
      {!hasSoil && !editing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Soil test report not entered</p>
            <p className="text-xs text-amber-700 mt-0.5 font-body">
              Nitrogen (N), Phosphorus (P), Potassium (K) and pH values are required to run AI crop recommendations and analysis.
              Get these from your Soil Health Card (available free from your local Krishi Vigyan Kendra).
            </p>
            <button
              onClick={() => setEditing(true)}
              className="mt-2 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Enter Soil Test Values →
            </button>
          </div>
        </div>
      )}

      {/* Values display */}
      {hasSoil && !editing && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Nitrogen (N)', value: farm.npk_nitrogen, unit: 'kg/ha', color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Phosphorus (P)', value: farm.npk_phosphorus, unit: 'kg/ha', color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Potassium (K)', value: farm.npk_potassium, unit: 'kg/ha', color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'pH Level', value: farm.ph_level, unit: '', color: 'text-orange-700', bg: 'bg-orange-50' },
          ].map(({ label, value, unit, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-3 py-2.5 text-center`}>
              <p className="text-[10px] text-gray-500 font-body">{label}</p>
              <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
              {unit && <p className="text-[10px] text-gray-400">{unit}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="mt-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'npk_nitrogen',   label: 'Nitrogen (N)',    placeholder: '0–140', min: 0, max: 140 },
              { key: 'npk_phosphorus', label: 'Phosphorus (P)',  placeholder: '0–145', min: 0, max: 145 },
              { key: 'npk_potassium',  label: 'Potassium (K)',   placeholder: '0–205', min: 0, max: 205 },
              { key: 'ph_level',       label: 'pH Level',        placeholder: '3.5–9.9', min: 3.5, max: 9.9 },
            ].map(({ key, label, placeholder, min, max }) => (
              <div key={key}>
                <label className="label text-xs">{label}</label>
                <input
                  className="input-field"
                  type="number"
                  step="0.1"
                  min={min}
                  max={max}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 font-body mt-2">
            Values from your Soil Health Card. N, P, K in kg/ha.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm mt-3"
          >
            {saving ? 'Saving…' : 'Save Soil Profile'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function FarmProfile() {
  const { isDemo }    = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [farm, setFarm]     = useState(null)
  const [fields, setFields] = useState([])
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const [inspectionModal, setInspectionModal] = useState(false)

  const reload = () => {
    setLoading(true)
    if (isDemo) {
      setFarm(MOCK_FARM)
      setFields(MOCK_FARM.fields)
      setLoading(false)
      return
    }
    getMyFarm()
      .then((res) => {
        setFarm(res.data.farm)
        return getFields(res.data.farm?.id)
      })
      .then((res) => {
        setFields(res.data.fields || [])
        return getMyInspections()
      })
      .then((res) => setInspections(res.data.inspections || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(reload, [isDemo])

  // Calculate used and remaining area
  const totalArea = parseFloat(farm?.farm_area || 0)
  const usedArea  = fields.reduce((sum, f) => sum + parseFloat(f.field_size || 0), 0)
  const remaining = Math.max(0, totalArea - usedArea)
  const isFull    = totalArea > 0 && usedArea >= totalArea

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this field?')) return
    if (!isDemo) await deleteField(id)
    setFields((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <p className="text-xs text-amber-700 font-body">🧪 <strong>Demo Mode</strong> — showing Patel Farm in Anand, Gujarat</p>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-heading font-bold text-2xl text-gray-900">🚜 Farm Profile</h1>
              <p className="text-sm text-gray-500 font-body mt-1">Your farm details and fields</p>
              {!loading && totalArea > 0 && (
                <p className="text-xs mt-1 font-body">
                  <span className="text-gray-500">Area used: </span>
                  <span className={usedArea >= totalArea ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>
                    {usedArea.toFixed(1)} / {totalArea} acres
                  </span>
                  {remaining > 0 && (
                    <span className="text-gray-400"> ({remaining.toFixed(1)} remaining)</span>
                  )}
                </p>
              )}
            </div>
            {isFull ? (
              <div className="text-right">
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 font-body">
                  Farm area full.<br/>Delete a field to add new.
                </div>
              </div>
            ) : (
              <button onClick={() => setModal('add')} id="btn-add-field" className="btn-primary text-sm">
                + Add Field
              </button>
            )}
          </div>

          {/* Farm details */}
          {loading ? (
            <div className="card h-24 animate-pulse bg-gray-50 mb-6" />
          ) : farm && (
            <>
              <div className="card mb-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Farm Name',  value: farm.farm_name || '—' },
                    { label: 'Location',   value: [farm.village, farm.district, farm.state].filter(Boolean).join(', ') || '—' },
                    { label: 'Soil Type',  value: farm.soil_type || '—' },
                    { label: 'Total Area', value: farm.farm_area ? `${farm.farm_area} acres` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 font-body uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 font-body">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Soil Profile Section */}
              <SoilProfileSection 
                farm={farm} 
                onUpdated={reload} 
                isDemo={isDemo} 
                onShowInspectionModal={() => setInspectionModal(true)} 
              />

              {/* Inspections List */}
              {inspections.length > 0 && (
                <div className="card mb-6">
                  <h3 className="font-heading font-semibold text-gray-800 mb-3">Service Requests</h3>
                  <div className="space-y-3">
                    {inspections.map(insp => (
                      <div key={insp.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            Soil Inspection 
                            <span className="text-xs text-gray-400 font-normal ml-2">
                              Requested for {new Date(insp.preferred_date).toLocaleDateString()}
                            </span>
                          </p>
                          {insp.notes && <p className="text-xs text-gray-500 mt-0.5">Note: {insp.notes}</p>}
                        </div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            insp.status === 'completed' ? 'bg-green-100 text-green-700' :
                            insp.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {insp.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <h2 className="font-heading font-semibold text-gray-800 mb-3">Fields ({loading ? '…' : fields.length})</h2>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="card h-36 animate-pulse bg-gray-50" />)}
            </div>
          ) : fields.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.map((f) => (
                <FieldCard
                  key={f.id}
                  field={f}
                  onEdit={() => setModal(f)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <span className="text-4xl">🌱</span>
              <p className="text-sm text-gray-500 font-body mt-2">No fields yet. Add your first field!</p>
            </div>
          )}
        </main>
      </div>

      {modal && (
        <FieldModal
          field={modal === 'add' ? null : modal}
          farmId={farm?.id}
          isDemo={isDemo}
          maxArea={remaining}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); reload() }}
        />
      )}

      {inspectionModal && (
        <InspectionModal
          onClose={() => setInspectionModal(false)}
          onSave={() => { setInspectionModal(false); reload() }}
        />
      )}
    </div>
  )
}

function InspectionModal({ onClose, onSave }) {
  const [step, setStep] = useState(1)
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleNext = () => {
    if(!date) return alert('Please select a date.')
    setStep(2)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await requestInspection({ preferred_date: date, notes })
      onSave()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to request inspection.')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-slide-up">
        {step === 1 ? (
          <>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">Request Soil Inspection</h3>
            <p className="text-sm text-gray-500 mb-4">Our agronomy team will visit your farm to conduct a professional soil analysis.</p>
            
            <div className="space-y-4">
              <div>
                <label className="label">Preferred Visit Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  min={today}
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                />
              </div>
              <div>
                <label className="label">Additional Notes (Optional)</label>
                <textarea 
                  className="input-field" 
                  rows="3" 
                  placeholder="E.g., Suspecting low nitrogen in the north field."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleNext} className="btn-primary flex-1">Next</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">Confirm Booking</h3>
            <p className="text-sm text-gray-500 mb-4">Review the details and confirm your request. An invoice will be sent to your email.</p>
            
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Service:</span>
                <span className="font-medium text-gray-900">Professional Soil Test</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Preferred Date:</span>
                <span className="font-medium text-gray-900">{new Date(date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 font-semibold">Total Amount:</span>
                <span className="font-bold text-green-700 text-lg">₹500</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} disabled={loading} className="btn-outline flex-1">Back</button>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 bg-green-600 hover:bg-green-700 text-white border-0 shadow-lg shadow-green-600/30">
                {loading ? 'Processing...' : 'Confirm & Pay ₹500'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
