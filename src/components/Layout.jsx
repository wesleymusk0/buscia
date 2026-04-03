import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Camera,
  List,
  History,
  Settings,
  LogOut,
  School,
  Menu,
  Users,
  X
} from 'lucide-react'
import { useState } from 'react'

function Layout() {
  const { user, userData, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Gerir Turmas', href: '/turmas', icon: Users },
    { name: 'Escanear Faltas', href: '/scan', icon: Camera },
    { name: 'Entrada Manual', href: '/manual', icon: List },
    { name: 'Histórico', href: '/history', icon: History },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <School className="w-8 h-8 text-primary-600" />
            <span className="ml-3 text-lg font-semibold text-gray-900">
              Busca Ativa
            </span>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center"
                >
                  <span className="text-primary-700 font-medium">
                    {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.displayName || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500">
                  {userData?.schoolId || 'Escola não definida'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center">
            <School className="w-7 h-7 text-primary-600" />
            <span className="ml-2 text-lg font-semibold">Busca Ativa</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-200 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}

            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
