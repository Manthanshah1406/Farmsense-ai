import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { useSocket } from '../context/SocketContext'
import SidebarWeather from './SidebarWeather'

export default function Sidebar() {
  const { user, isDemo, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { liveAlerts } = useSocket() || {}
  const unread = liveAlerts?.length || 0
  const location = useLocation()
  const isWeatherPage = location.pathname === '/weather'

  const links = [
    { name: t('sidebar.dashboard'), icon: '🏠', path: '/dashboard' },
    { name: t('sidebar.alerts'), icon: '🔔', path: '/alerts' },
    { name: t('sidebar.suggestions'), icon: '💡', path: '/suggestions' },
    { name: t('sidebar.crop_comparison'), icon: '🌾', path: '/crop-comparison' },
    { name: t('sidebar.farm_profile'), icon: '🚜', path: '/farm-profile' },
    { name: t('sidebar.weather'), icon: '🌤️', path: '/weather' },
    { name: t('sidebar.govt_schemes'), icon: '🏛️', path: '/schemes' },
    { name: t('sidebar.disease_detection'), icon: '🌿', path: '/disease-detection' },
  ]

  if (user?.is_admin) {
    links.push({ name: t('sidebar.admin_panel'), icon: '🛡️', path: '/admin' })
  }

  links.push({ name: t('sidebar.settings'), icon: '⚙️', path: '/settings' })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-r border-gray-100 py-5">

      {/* Logo */}
      <div className="flex items-center gap-2 px-5 mb-6">
        <span className="text-2xl">🌾</span>
        <span className="font-heading font-bold text-primary text-lg">FarmSense AI</span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {links.map(({ icon, name, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="text-base">{icon}</span>
            <span className="flex-1">{name}</span>
            {name === t('sidebar.alerts') && unread > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Weather widget — hide on /weather page */}
      {!isDemo && !isWeatherPage && user?.profile_completed && (
        <SidebarWeather />
      )}

      {/* Demo placeholder */}
      {isDemo && (
        <div className="mx-4 mb-4 bg-amber-50/50 border border-amber-100 rounded-xl p-3">
          <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider mb-1">{t('sidebar.demo_mode')}</p>
          <p className="text-xs text-amber-600/80 font-body">Viewing read-only sample farm data.</p>
        </div>
      )}

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm font-medium group"
        >
          <span className="text-xl grayscale group-hover:grayscale-0">🚪</span>
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  )
}
