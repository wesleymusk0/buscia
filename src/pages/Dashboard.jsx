import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClasses, useStatistics } from '../hooks/useFirebase'
import {
  Camera,
  Users,
  School,
  ChevronRight,
  Smartphone,
  CheckCircle,
  Printer,
  FileText
} from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()
  const { user, userData } = useAuth()
  const schoolId = userData?.schoolId || 'demo_school'

  const { classes, loading: classesLoading } = useClasses(schoolId)
  const { stats, loading: statsLoading } = useStatistics(schoolId)
  const [selectedClass, setSelectedClass] = useState('')
  const [agentStatus, setAgentStatus] = useState({ connected: false, configured: false })

  useEffect(() => {
    const checkAgent = async () => {
      try {
        const response = await fetch('http://localhost:3001/health')
        const data = await response.json()
        setAgentStatus({ 
          connected: true, 
          configured: data.configured,
          wrongSchool: data.schoolId && data.schoolId !== schoolId
        })
      } catch (e) {
        setAgentStatus({ connected: false, configured: false })
      }
    }
    checkAgent()
    const interval = setInterval(checkAgent, 10000)
    return () => clearInterval(interval)
  }, [schoolId])

  const handleStartScan = () => {
    if (!selectedClass) {
      // Shake animation ou toast
      return
    }
    navigate('/scan', { state: { selectedClass } })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
          <School className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {userData?.schoolName || 'Busca Ativa Escolar'}
        </h1>
        <p className="text-gray-600 mt-1">
          Selecione a turma para começar
        </p>
      </div>

      {/* Status Agente Local */}
      {!agentStatus.connected ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Smartphone className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800 font-medium text-sm">
              Agente Local não detectado. Ligue o programa na escola.
            </span>
          </div>
          <button 
            onClick={() => window.open('/setup', '_blank')}
            className="text-xs font-bold text-yellow-700 underline"
          >
            Como instalar?
          </button>
        </div>
      ) : !agentStatus.configured ? (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-primary-600 mr-2" />
            <span className="text-primary-800 font-medium text-sm">
              Agente detectado. Clique para vincular a esta escola.
            </span>
          </div>
          <button 
            onClick={() => navigate('/setup')}
            className="px-3 py-1 bg-primary-600 text-white text-xs rounded-lg font-bold"
          >
            Vincular
          </button>
        </div>
      ) : agentStatus.wrongSchool ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
          <div className="flex items-center">
            <span className="text-red-800 font-medium text-sm">
              ⚠️ Este computador está vinculado a OUTRA escola.
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-success-50 border border-success-200 rounded-xl p-4 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-success-600 mr-2" />
          <span className="text-success-800 font-medium">
            Agente vinculado e pronto para envios
          </span>
        </div>
      )}

      {/* Seletor de Turma */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Selecione a Turma
        </label>

        {classesLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando turmas...</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma turma cadastrada
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedClass === cls.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedClass === cls.id ? 'bg-primary-200' : 'bg-gray-100'
                  }`}>
                    <Users className={`w-5 h-5 ${
                      selectedClass === cls.id ? 'text-primary-700' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="ml-3">
                    <p className={`font-semibold ${
                      selectedClass === cls.id ? 'text-primary-900' : 'text-gray-900'
                    }`}>
                      {cls.name}
                    </p>
                    {cls.students && (
                      <p className="text-sm text-gray-500">
                        {Object.keys(cls.students).length} alunos
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botão Principal */}
      <button
        onClick={handleStartScan}
        disabled={!selectedClass}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center transition-all ${
          selectedClass
            ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Camera className="w-6 h-6 mr-3" />
        Escanear Faltas
        <ChevronRight className="w-6 h-6 ml-2" />
      </button>

      {/* Estatísticas Rápidas */}
      {!statsLoading && stats.today > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Hoje</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
                <p className="text-sm text-gray-500">faltas registradas</p>
              </div>
            </div>
            <a href="/history" className="text-primary-600 hover:text-primary-700 text-sm">
              Ver histórico →
            </a>
          </div>
        </div>
      )}

      {/* Ajuda Rápida */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-900 mb-2">Como usar:</p>
        <ol className="list-decimal list-inside space-y-1 mb-4">
          <li>Selecione a turma acima</li>
          <li>Clique em "Escanear Faltas"</li>
          <li>Aponte a câmera para o gabarito marcado</li>
          <li>O sistema detecta automaticamente e envia as mensagens</li>
        </ol>

        <a
          href="/print"
          className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
        >
          <div className="p-2 bg-primary-100 rounded-lg">
            <Printer className="w-5 h-5 text-primary-600" />
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900">Imprimir Gabarito</p>
            <p className="text-gray-500">Gere o papelzinho para o inspetor marcar</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
        </a>
      </div>
    </div>
  )
}

export default Dashboard
