import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { SCHEMES, CATEGORIES } from '../data/govSchemes'

const categoryColors = {
  'Income Support':       'bg-green-100 text-green-700',
  'Crop Insurance':       'bg-blue-100 text-blue-700',
  'Credit & Loan':        'bg-purple-100 text-purple-700',
  'Solar & Irrigation':   'bg-yellow-100 text-yellow-700',
  'Organic Farming':      'bg-emerald-100 text-emerald-700',
  'Farm Mechanization':   'bg-orange-100 text-orange-700',
  'Pension':              'bg-pink-100 text-pink-700',
  'Soil Health':          'bg-amber-100 text-amber-700',
  'Oilseed & Pulses':     'bg-lime-100 text-lime-700',
  'Agriculture Development': 'bg-teal-100 text-teal-700',
  'Market & Trade':       'bg-cyan-100 text-cyan-700',
  'Infrastructure':       'bg-slate-100 text-slate-700',
}

function SchemeCard({ scheme, onClick }) {
  return (
    <div
      onClick={onClick}
      className="card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{scheme.icon}</span>
          <div>
            <h3 className="font-heading font-bold text-gray-900 text-sm leading-tight">{scheme.name}</h3>
            <p className="text-xs text-gray-400 font-body mt-0.5">Since {scheme.launchedYear}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${categoryColors[scheme.category] || 'bg-gray-100 text-gray-600'}`}>
          {scheme.category}
        </span>
      </div>

      <div className="bg-primary/5 rounded-xl px-3 py-2">
        <p className="text-xs text-gray-500 font-body">Benefit</p>
        <p className="text-sm font-semibold text-primary mt-0.5">{scheme.benefit}</p>
      </div>

      <p className="text-xs text-gray-500 font-body leading-relaxed line-clamp-2">
        {scheme.description}
      </p>

      <div className="flex gap-2 mt-auto pt-1">
        <a
          href={scheme.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="w-full text-center text-xs bg-primary text-white rounded-lg py-1.5 font-medium hover:bg-primary/90 transition-colors"
        >
          Apply Now →
        </a>
      </div>
    </div>
  )
}

function SchemeModal({ scheme, onClose }) {
  if (!scheme) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{scheme.icon}</span>
            <div>
              <h2 className="font-heading font-bold text-xl text-gray-900">{scheme.name}</h2>
              <p className="text-xs text-gray-400 font-body">{scheme.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Benefit highlight */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl px-4 py-3">
            <p className="text-xs text-gray-500 font-body uppercase tracking-wide">Key Benefit</p>
            <p className="text-lg font-bold text-primary mt-1">{scheme.benefit}</p>
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColors[scheme.category] || 'bg-gray-100 text-gray-600'}`}>
              {scheme.category}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-600">
              {scheme.tag} Scheme
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
              Since {scheme.launchedYear}
            </span>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-2">About this Scheme</h4>
            <p className="text-sm text-gray-600 font-body leading-relaxed">{scheme.description}</p>
          </div>

          {/* Eligibility */}
          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-2">Who Can Apply</h4>
            <ul className="space-y-1.5">
              {scheme.eligibility.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 font-body">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span> {e}
                </li>
              ))}
            </ul>
          </div>

          {/* Documents */}
          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-2">Documents Required</h4>
            <div className="flex flex-wrap gap-2">
              {scheme.documents.map((d, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-body">
                  📄 {d}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <a
              href={scheme.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-primary text-white rounded-xl py-3 font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              🔗 Apply on Official Website
            </a>
          </div>

          <p className="text-xs text-gray-400 font-body text-center">
            Links open official government portals. Content based on publicly available government data.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function GovSchemes() {
  const [mobileOpen, setMobileOpen]         = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch]                 = useState('')
  const [selected, setSelected]             = useState(null)

  const filtered = SCHEMES.filter(s => {
    const matchCat    = activeCategory === 'All' || s.category === activeCategory
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      || s.fullName.toLowerCase().includes(search.toLowerCase())
      || s.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 max-w-6xl mx-auto w-full">

          {/* ── Hero Banner ── */}
          <div className="relative w-full mb-0">
            <img
              src="/schemes-banner.png"
              alt="PM Modi Government Schemes for Farmers"
              className="w-full h-auto block"
            />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="font-heading font-bold text-2xl text-gray-900">🏛️ Government Schemes</h1>
              <p className="text-sm text-gray-500 font-body mt-0.5">
                {SCHEMES.length} central government schemes for Indian farmers — with official apply links
              </p>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search schemes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field w-full sm:max-w-sm"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all
                    ${activeCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-xs text-gray-400 font-body mb-4">
              Showing {filtered.length} scheme{filtered.length !== 1 ? 's' : ''}
            </p>

            {/* Grid */}
            {filtered.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(scheme => (
                  <SchemeCard
                    key={scheme.id}
                    scheme={scheme}
                    onClick={() => setSelected(scheme)}
                  />
                ))}
              </div>
            ) : (
              <div className="card text-center py-16">
                <span className="text-4xl">🔍</span>
                <p className="text-gray-500 font-body mt-3">No schemes found for "{search}"</p>
                <button onClick={() => { setSearch(''); setActiveCategory('All') }}
                  className="text-primary text-sm mt-2 hover:underline">Clear filters</button>
              </div>
            )}
          </div>
        </main>
      </div>

      <SchemeModal scheme={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
