import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAbsenceHistory, useFirebaseData } from '../hooks/useFirebase'
import {
  Calendar,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function History() {
  const { userData } = useAuth()
  const schoolId = userData?.schoolId

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { history, loading } = useAbsenceHistory(schoolId, 100)
  const { data: schoolsData } = useFirebaseData('schools')

  // Filtrar por mês
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const monthHistory = history.filter(item => {
    const itemDate = parseISO(item.date)
    return itemDate >= monthStart && itemDate <= monthEnd
  })

  // Agrupar por data
  const groupedByDate = monthHistory.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = []
    }
    acc[item.date].push(item)
    return acc
  }, {})

  // Estatísticas do mês
  const monthStats = monthHistory.reduce((acc, item) => {
    acc.total += item.count
    acc.classes.add(item.classId)
    return acc
  }, { total: 0, classes: new Set() })

  // Exportar CSV
  const exportCSV = () => {
    const headers = ['Data', 'Turma', 'Alunos Faltantes', 'Status']
    const rows = monthHistory.map(item => [
      item.date,
      item.classId,
      item.count,
      'Enviado'
    ])

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `faltas-${format(currentMonth, 'yyyy-MM')}.csv`
    a.click()
  }

  const getClassName = (classId) => {
    if (!schoolsData || !schoolId) return classId
    return schoolsData[schoolId]?.classes?.[classId]?.name || classId
  }

  const getStatusIcon = (date) => {
    const itemDate = parseISO(date)
    const today = new Date()
    const diffDays = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24))

    if (diffDays < 1) {
      return <CheckCircle className="w-5 h-5 text-success-500" />
    } else if (diffDays < 3) {
      return <Clock className="w-5 h-5 text-warning-500" />
    } else {
      return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico</h1>
          <p className="text-gray-600 mt-1">Visualize faltas registradas</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Download className="w-5 h-5 mr-2" />
          Exportar CSV
        </button>
      </div>

      {/* Estatísticas do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total de Faltas</p>
              <p className="text-2xl font-bold text-gray-900">{monthStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-success-100 rounded-lg">
              <Users className="w-6 h-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Turmas Afetadas</p>
              <p className="text-2xl font-bold text-gray-900">{monthStats.classes.size}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-warning-100 rounded-lg">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Registros</p>
              <p className="text-2xl font-bold text-gray-900">{monthHistory.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação do Mês */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-medium">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lista de Faltas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Registros do Mês</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : monthHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum registro encontrado para este mês
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedByDate)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .map(([date, items]) => (
                <div key={date} className="p-4">
                  <div className="flex items-center mb-3">
                    <Calendar className="w-5 h-5 text-primary-600 mr-2" />
                    <span className="font-medium text-gray-900">
                      {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="ml-7 space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          {getStatusIcon(item.date)}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-gray-900">
                            {getClassName(item.classId)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.count} aluno(s) faltante(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400">
                            {item.submittedAt
                              ? format(parseISO(item.submittedAt), 'HH:mm')
                              : '--:--'
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default History
