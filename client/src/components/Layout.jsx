import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const { isDemo } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
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

        {/* Page Content */}
        <main className="flex-1 flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
