import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import FirstSetup from './pages/FirstSetup'
import Dashboard from './pages/Dashboard'
import ScanAbsences from './pages/ScanAbsences'
import History from './pages/History'
import Settings from './pages/Settings'
import PrintTemplate from './pages/PrintTemplate'
import ManageClasses from './pages/ManageClasses'

function PrivateRoute({ children, requireConfigured = true }) {
  const { user, userData, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  // Se requer configuração e usuário não está configurado, vai para setup
  if (requireConfigured && !userData?.isConfigured) {
    return <Navigate to="/setup" />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Configuração inicial - não requer estar configurado */}
      <Route
        path="/setup"
        element={
          <PrivateRoute requireConfigured={false}>
            <FirstSetup />
          </PrivateRoute>
        }
      />

      {/* Rotas principais - requer configuração */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="scan" element={<ScanAbsences />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
        <Route path="print" element={<PrintTemplate />} />
        <Route path="turmas" element={<ManageClasses />} />
      </Route>
    </Routes>
  )
}

export default App
