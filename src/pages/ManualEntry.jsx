import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useClasses, useStudents, useSubmitAbsences } from '../hooks/useFirebase'
import {
  ChevronDown,
  Check,
  X,
  Send,
  RotateCcw,
  Search,
  Loader2,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'

function ManualEntry() {
  const { userData } = useAuth()
  const schoolId = userData?.schoolId

  const { classes, loading: classesLoading } = useClasses(schoolId)
  const [selectedClass, setSelectedClass] = useState('')
  const { students, loading: studentsLoading } = useStudents(schoolId, selectedClass)
  const { submitAbsences, submitting } = useSubmitAbsences()

  const [selectedStudents, setSelectedStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const selectedClassData = classes.find(c => c.id === selectedClass)

  // Filtrar alunos
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.number.toString().includes(searchTerm)
  )

  // Toggle seleção
  const toggleStudent = (number) => {
    setSelectedStudents(prev =>
      prev.includes(number)
        ? prev.filter(n => n !== number)
        : [...prev, number].sort((a, b) => a - b)
    )
  }

  // Selecionar todos
  const selectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.number))
    }
  }

  // Limpar seleção
  const clearSelection = () => {
    setSelectedStudents([])
    setSelectedClass('')
    setSearchTerm('')
  }

  // Enviar
  const handleSubmit = async () => {
    if (!selectedClass) {
      toast.error('Selecione uma turma')
      return
    }
    if (selectedStudents.length === 0) {
      toast.error('Selecione pelo menos um aluno')
      return
    }

    const result = await submitAbsences(schoolId, selectedClass, selectedStudents)
    if (result.success) {
      clearSelection()
      setShowConfirm(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entrada Manual</h1>
          <p className="text-gray-600 mt-1">Selecione os alunos faltantes</p>
        </div>
      </div>

      {/* Seleção de Turma */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Turma
        </label>
        <div className="relative">
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value)
              setSelectedStudents([])
              setSearchTerm('')
            }}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 appearance-none"
          >
            <option value="">Selecione uma turma...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {selectedClass && (
        <>
          {/* Barra de Pesquisa e Ações */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou número..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                    ? 'Desmarcar Todos'
                    : 'Selecionar Todos'}
                </button>

                <button
                  onClick={clearSelection}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Alunos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {filteredStudents.length} aluno(s) encontrado(s)
                </span>
              </div>
              <span className="text-sm font-medium text-primary-600">
                {selectedStudents.length} selecionado(s)
              </span>
            </div>

            {studentsLoading ? (
              <div className="p-8 text-center text-gray-500">Carregando alunos...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudents.includes(student.number)
                  return (
                    <button
                      key={student.number}
                      onClick={() => toggleStudent(student.number)}
                      className={`w-full p-4 flex items-center hover:bg-gray-50 transition-colors text-left ${
                        isSelected ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isSelected ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="font-medium">{student.number}</span>
                        )}
                      </div>

                      <div className="ml-4 flex-1">
                        <p className="font-medium text-gray-900">{student.name}</p>
                        {student.phone && (
                          <p className="text-sm text-gray-500">{student.phone}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Resumo */}
          {selectedStudents.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky bottom-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resumo</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedStudents.length} aluno(s) em {selectedClassData?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                  className="px-6 py-3 bg-success-600 text-white rounded-lg font-medium hover:bg-success-700 disabled:opacity-50 flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar Faltas
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Envio</h3>

            <p className="text-gray-600 mb-6">
              Você está prestes a registrar {selectedStudents.length} falta(s) para a turma{' '}
              <strong>{selectedClassData?.name}</strong>. As mensagens serão enviadas
              automaticamente para os responsáveis.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 px-4 bg-success-600 text-white rounded-lg hover:bg-success-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManualEntry
