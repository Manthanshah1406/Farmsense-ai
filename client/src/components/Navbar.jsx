import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

export default function Navbar({ onToggleMobileSidebar }) {
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const [showLang, setShowLang] = useState(false)

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    setShowLang(false)
  }

  if (!user) return null

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 h-14 flex items-center justify-between px-4 sm:px-6 w-full shrink-0">
      {/* Left side: Mobile menu toggle / Brand Logo */}
      <div className="flex items-center gap-3 lg:hidden">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle navigation"
          >
            <span className="text-xl">☰</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xl">🌾</span>
          <span className="font-heading font-bold text-primary text-base">FarmSense AI</span>
        </div>
      </div>

      {/* Right side: All navbar controls aligned to the right side */}
      <div className="ml-auto flex items-center gap-3 sm:gap-5">
        {/* Language Switcher */}
        <div className="relative">
          <button 
            onClick={() => setShowLang(!showLang)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-primary transition-colors bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm hover:shadow"
          >
            <span>🌐</span>
            <span className="uppercase font-semibold">{i18n.language?.split('-')[0] || 'en'}</span>
          </button>
          
          {showLang && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLang(false)}></div>
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-slide-up origin-top-right">
                <button onClick={() => changeLanguage('en')} className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50">English (EN)</button>
                <button onClick={() => changeLanguage('hi')} className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50">हिन्दी (HI)</button>
                <button onClick={() => changeLanguage('gu')} className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50">ગુજરાતી (GU)</button>
              </div>
            </>
          )}
        </div>

        {/* User profile avatar & name */}
        <div className="flex items-center gap-2 bg-gray-50/80 px-2.5 py-1 rounded-full border border-gray-100">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-bold text-primary shrink-0">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-xs sm:text-sm font-medium text-gray-700 font-body max-w-[120px] sm:max-w-none truncate">{user.name}</span>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="text-xs font-medium text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

