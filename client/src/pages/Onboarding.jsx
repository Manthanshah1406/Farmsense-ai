import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createFarm, addField, getMyFarm } from '../api/farmApi'
import { useAuth } from '../context/AuthContext'
import { getStates, getDistricts, getTalukas, getPincode } from '../data/indiaLocations'

const STEPS     = ['Personal Info', 'Farm Location', 'First Field']
const SOIL_TYPES = [
  { value: 'black',  label: 'Black (Cotton soil)' },
  { value: 'red',    label: 'Red' },
  { value: 'loamy',  label: 'Loamy' },
  { value: 'sandy',  label: 'Sandy' },
  { value: 'clay',   label: 'Clay' },
  { value: 'silt',   label: 'Silt' },
]
const IRRIGATION_TYPES = ['Drip', 'Sprinkler', 'Flood', 'Canal', 'Borewell', 'Rainfed']
const CROP_STAGES      = ['sowing', 'vegetative', 'flowering', 'fruiting', 'harvest']
const SEASONS          = ['Kharif', 'Rabi', 'Zaid']
const COMMON_CROPS     = [
  'Cotton', 'Wheat', 'Rice', 'Maize', 'Sugarcane', 'Soybean',
  'Groundnut', 'Bajra', 'Jowar', 'Chickpea', 'Mustard', 'Other',
]

export default function Onboarding() {
  const { user, updateUser } = useAuth()
  const navigate         = useNavigate()
  const [step, setStep]  = useState(0)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // If farm already exists, redirect to /farm-profile to set NPK values
  useEffect(() => {
    getMyFarm()
      .then((res) => {
        if (res.data.farm?.id) {
          navigate('/farm-profile', { replace: true })
        }
      })
      .catch(() => { /* no farm yet — stay on onboarding */ })
  }, [])

  // Location cascade state
  const [districts, setDistricts] = useState([])
  const [talukas, setTalukas]     = useState([])

  const [farmData, setFarmData] = useState({
    farm_name:       '',
    total_area_acres: '',
    state:           '',
    district:        '',
    taluka:          '',
    village:         '',
    pincode:         '',
    soil_type:       'black',
    irrigation_type: 'Drip',
  })

  const [fieldData, setFieldData] = useState({
    field_name:   'Field 1',
    current_crop: '',
    crop_stage:   'vegetative',
    field_size:   '',
    season:       'Kharif',
    sow_date:     '',
  })

  const setFarm  = (k, v) => setFarmData(p => ({ ...p, [k]: v }))
  const setField = (k, v) => setFieldData(p => ({ ...p, [k]: v }))

  // Sowing date bounds
  const today = new Date().toISOString().split('T')[0]
  const minSowDate = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 5)
    return d.toISOString().split('T')[0]
  })()

  // Cascade: state → districts
  useEffect(() => {
    const d = getDistricts(farmData.state)
    setDistricts(d)
    setFarm('district', d[0] || '')
  }, [farmData.state])

  // Cascade: district → talukas + pincode
  useEffect(() => {
    const t = getTalukas(farmData.state, farmData.district)
    setTalukas(t)
    setFarm('taluka', t[0] || '')
    const pin = getPincode(farmData.state, farmData.district)
    setFarm('pincode', pin)
  }, [farmData.district])

  // Step validation
  const validateStep = () => {
    if (step === 0) {
      if (!farmData.farm_name.trim()) return 'Farm name is required'
      if (!farmData.total_area_acres || farmData.total_area_acres <= 0) return 'Enter a valid farm area'
    }
    if (step === 1) {
      if (!farmData.state)    return 'Please select a state'
      if (!farmData.district) return 'Please select a district'
      if (!farmData.pincode)  return 'Pincode is required'
    }
    return null
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const handleBack = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async () => {
    setError('')

    // Validate field area against farm area
    const farmArea  = parseFloat(farmData.total_area_acres)
    const fieldArea = parseFloat(fieldData.field_size)
    if (fieldData.field_size && fieldArea > farmArea) {
      setError(`Field area (${fieldArea} acres) cannot exceed total farm area (${farmArea} acres).`)
      return
    }

    setLoading(true)
    try {
      const payload = {
        farm_name:       farmData.farm_name,
        state:           farmData.state,
        district:        farmData.district,
        taluka:          farmData.taluka,
        village:         farmData.village,
        pincode:         farmData.pincode,
        farm_area:       parseFloat(farmData.total_area_acres),
        area_unit:       'acre',
        soil_type:       farmData.soil_type,
        irrigation_type: farmData.irrigation_type,
        current_crop:    fieldData.current_crop,
        sow_date:        fieldData.sow_date || undefined,
      }

      const farmRes = await createFarm(payload)
      const farmId  = farmRes.data.farm?.id

      if (farmId && fieldData.current_crop) {
        await addField(farmId, {
          field_name:   fieldData.field_name,
          field_size:   parseFloat(fieldData.field_size) || parseFloat(farmData.total_area_acres),
          current_crop: fieldData.current_crop,
          sow_date:     fieldData.sow_date || undefined,
        })
      }

      if (updateUser) {
        updateUser({ profile_completed: true })
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${i < step ? 'bg-secondary text-white' : i === step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-primary' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-secondary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 animate-slide-up">
          <h2 className="font-heading font-bold text-xl text-gray-900 mb-1">{STEPS[step]}</h2>
          <p className="text-sm text-gray-500 mb-6 font-body">Step {step + 1} of {STEPS.length}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5 font-body">
              {error}
            </div>
          )}

          {/* ── Step 0: Farm Details ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label">Farm Name</label>
                <input className="input-field" value={farmData.farm_name}
                  onChange={e => setFarm('farm_name', e.target.value)}
                  placeholder="e.g. Ravi's Farm" />
              </div>
              <div>
                <label className="label">Total Farm Area (acres)</label>
                <input className="input-field" type="number" min="0.1" step="0.1"
                  value={farmData.total_area_acres}
                  onChange={e => setFarm('total_area_acres', e.target.value)}
                  placeholder="e.g. 5" />
              </div>
              <div>
                <label className="label">Irrigation Type</label>
                <select className="input-field" value={farmData.irrigation_type}
                  onChange={e => setFarm('irrigation_type', e.target.value)}>
                  {IRRIGATION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── Step 1: Farm Location ── */}
          {step === 1 && (
            <div className="space-y-4">

              {/* State */}
              <div>
                <label className="label">State</label>
                <select className="input-field" value={farmData.state}
                  onChange={e => setFarm('state', e.target.value)}>
                  <option value="">-- Select State --</option>
                  {getStates().map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="label">District</label>
                <select className="input-field" value={farmData.district}
                  onChange={e => setFarm('district', e.target.value)}
                  disabled={!farmData.state}>
                  <option value="">-- Select District --</option>
                  {districts.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              {/* Taluka */}
              <div>
                <label className="label">Taluka</label>
                <select className="input-field" value={farmData.taluka}
                  onChange={e => setFarm('taluka', e.target.value)}
                  disabled={!farmData.district}>
                  <option value="">-- Select Taluka --</option>
                  {talukas.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Village + Pincode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Village (optional)</label>
                  <input className="input-field" value={farmData.village}
                    onChange={e => setFarm('village', e.target.value)}
                    placeholder="Your village" />
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input className="input-field" value={farmData.pincode}
                    onChange={e => setFarm('pincode', e.target.value)}
                    placeholder="Auto-filled" maxLength={6} />
                  <p className="text-xs text-gray-400 mt-1">Auto-filled from district</p>
                </div>
              </div>

              {/* Soil Type */}
              <div>
                <label className="label">Soil Type</label>
                <select className="input-field" value={farmData.soil_type}
                  onChange={e => setFarm('soil_type', e.target.value)}>
                  {SOIL_TYPES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Step 2: First Field ── */}
          {step === 2 && (
            <div className="space-y-4">

              {/* Farm area reference */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-800 font-body">
                Total farm area: <strong>{farmData.total_area_acres} acres</strong>
                {fieldData.field_size && (
                  <span className="ml-2 text-green-600">
                    — remaining: <strong>{Math.max(0, parseFloat(farmData.total_area_acres) - parseFloat(fieldData.field_size || 0)).toFixed(1)} acres</strong>
                  </span>
                )}
              </div>

              <div>
                <label className="label">Field Name</label>
                <input className="input-field" value={fieldData.field_name}
                  onChange={e => setField('field_name', e.target.value)}
                  placeholder="e.g. North Field" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Current Crop <span className="text-gray-400">(optional)</span></label>
                  <select className="input-field" value={fieldData.current_crop}
                    onChange={e => setField('current_crop', e.target.value)}>
                    <option value="">-- No crop yet --</option>
                    {COMMON_CROPS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Season</label>
                  <select className="input-field" value={fieldData.season}
                    onChange={e => setField('season', e.target.value)}>
                    {SEASONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Field Area (acres)</label>
                  <input className="input-field" type="number" min="0.1" step="0.1"
                    max={farmData.total_area_acres}
                    value={fieldData.field_size}
                    onChange={e => {
                      const val = parseFloat(e.target.value)
                      const max = parseFloat(farmData.total_area_acres)
                      if (val > max) {
                        setError(`Field area cannot exceed total farm area (${max} acres)`)
                      } else {
                        setError('')
                      }
                      setField('field_size', e.target.value)
                    }}
                    placeholder={farmData.total_area_acres || '2.5'} />
                </div>
                <div>
                  <label className="label">Sowing Date <span className="text-gray-400">(optional)</span></label>
                  <input className="input-field" type="date"
                    min={minSowDate}
                    max={today}
                    value={fieldData.sow_date}
                    onChange={e => setField('sow_date', e.target.value)} />
                </div>
              </div>

              <p className="text-xs text-gray-400 font-body">
                * Crop stage is auto-calculated from sowing date. You can add more fields later.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={handleBack} className="btn-outline flex-1">← Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} className="btn-primary flex-1">Continue →</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Setting up…
                  </span>
                ) : 'Finish Setup 🚀'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
