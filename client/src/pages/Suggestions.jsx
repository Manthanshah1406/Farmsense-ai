import { useEffect, useState, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import SuggestionCard from '../components/SuggestionCard'
import { useAuth } from '../context/AuthContext'
import { getSuggestions, askAI } from '../api/suggestionApi'
import { getMyFarm } from '../api/farmApi'
import { MOCK_SUGGESTIONS } from '../mock/mockData'

const CATEGORIES = ['all', 'irrigation', 'fertilizer', 'pest_risk', 'harvest']
const CAT_LABELS = {
  all: 'All', irrigation: '💧 Irrigation', fertilizer: '🧪 Fertilizer',
  pest_risk: '🐛 Pest Risk', harvest: '🌾 Harvest',
}

export default function Suggestions() {
  const { isDemo }                  = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [category, setCategory]     = useState('all')
  const [loading, setLoading]       = useState(true)

  // Chat State
  const [chatHistory, setChatHistory] = useState([])
  const [query, setQuery] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (isDemo) {
      setSuggestions(MOCK_SUGGESTIONS)
      setLoading(false)
      return
    }
    getMyFarm()
      .then((res) => getSuggestions(res.data.farm?.id))
      .then((res) => setSuggestions(res.data.suggestions || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isDemo])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleAskAI = async (e) => {
    e.preventDefault()
    if (!query.trim() || isDemo) return

    const userMessage = { role: 'user', content: query }
    setChatHistory((prev) => [...prev, userMessage])
    setQuery('')
    setChatLoading(true)

    try {
      const historyDict = chatHistory.reduce((acc, msg, i) => {
        acc[msg.role + '_' + i] = msg.content
        return acc
      }, {})

      const res = await askAI(userMessage.content, historyDict)
      const aiMessage = { role: 'assistant', content: res.data.response }
      setChatHistory((prev) => [...prev, aiMessage])
    } catch (err) {
      console.error(err)
      setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const filtered = category === 'all'
    ? suggestions
    : suggestions.filter((s) => s.category === category)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <Navbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <p className="text-xs text-amber-700 font-body">🧪 <strong>Demo Mode</strong> — ML-generated sample suggestions shown. Chat is disabled.</p>
          </div>
        )}
        
        <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-hidden">
          {/* Left Column: Suggestions */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 pr-2">
            {/* Sticky/Fixed Header & Category Tabs */}
            <div className="shrink-0 mb-4">
              <div className="mb-4">
                <h1 className="font-heading font-bold text-2xl text-gray-900">💡 Daily Insights</h1>
                <p className="text-sm text-gray-500 font-body mt-1">Scheduled farming advice from our ML models</p>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto py-1 pb-3 border-b border-gray-100">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all font-body flex items-center gap-1.5 cursor-pointer
                      ${category === cat
                        ? 'bg-primary text-white shadow-md scale-[1.02]'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-secondary hover:text-secondary hover:bg-gray-50'
                      }`}
                  >
                    {CAT_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Cards List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-8 min-h-0">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="card h-32 animate-pulse bg-gray-50" />)}
                </div>
              ) : filtered.length ? (
                filtered.map((s) => <SuggestionCard key={s.id} suggestion={s} />)
              ) : (
                <div className="card text-center py-16">
                  <span className="text-5xl">🤖</span>
                  <h3 className="font-heading font-semibold text-gray-700 mt-4">No Insights Yet</h3>
                  <p className="text-sm text-gray-500 font-body mt-1">Check back after daily analysis runs.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Chat */}
          <div className="lg:w-[450px] flex flex-col card p-0 overflow-hidden border-primary/20 shadow-md">
            <div className="bg-primary text-white p-4">
              <h2 className="font-heading font-semibold flex items-center gap-2">
                <span className="text-xl">🤖</span> FarmSense AI Assistant
              </h2>
              <p className="text-primary-100 text-xs font-body mt-1">Ask me anything about your farm, crop health, or market trends!</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-[300px]">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 font-body text-sm">
                  <p>No messages yet.</p>
                  <p className="mt-2">Try asking: "Should I irrigate today based on the weather?"</p>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 font-body text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-tr-sm' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm whitespace-pre-wrap'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-500 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-gray-100">
              <form onSubmit={handleAskAI} className="flex gap-2">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isDemo ? "Disabled in demo mode" : "Ask FarmSense AI..."}
                  disabled={isDemo || chatLoading}
                  className="flex-1 bg-gray-50 border border-gray-200 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-primary font-body"
                />
                <button 
                  type="submit" 
                  disabled={!query.trim() || isDemo || chatLoading}
                  className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 -ml-0.5">
                    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
