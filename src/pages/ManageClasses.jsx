import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useClasses } from '../hooks/useFirebase'
import { ref, push, set, remove } from 'firebase/database'
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

function ManageClasses() {
  const { userData, db } = useAuth()
  const schoolId = userData?.schoolId || 'demo_school'
  const { classes, loading } = useClasses(schoolId)
  
  // Create / Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [currentClass, setCurrentClass] = useState(null)
  const [className, setClassName] = useState('')
  const [students, setStudents] = useState('')

  const handleEdit = (cls) => {
    setCurrentClass(cls)
    setClassName(cls.name)
    
    // Transform students object to text
    if (cls.students) {
      const studentText = Object.keys(cls.students).map(number => `${number} - ${cls.students[number].name} - ${cls.students[number].phone || ''}`).join('\n')
      setStudents(studentText)
    } else {
      setStudents('')
    }
    
    setIsEditing(true)
  }

  const handleDelete = async (classId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta turma e todos os seus alunos? Questa ação não pode ser desfeita.')) return
    
    try {
      await remove(ref(db, `schools/${schoolId}/classes/${classId}`))
      toast.success('Turma excluída com sucesso!')
    } catch (error) {
      console.error('Firebase erro:', error?.message || error)
      toast.error('Erro ao excluir turma')
    }
  }

  const handleSave = async () => {
    if (!className.trim()) {
      toast.error('O nome da turma é obrigatório')
      return
    }

    try {
      // Parse students text back to object
      const studentsObj = {}
      if (students.trim()) {
        const lines = students.trim().split('\n')
        lines.forEach(line => {
          const parts = line.split('-').map(p => p.trim())
          if (parts.length >= 2) {
            const number = parts[0]
            const name = parts[1]
            const phone = parts[2] || ''
            if (!isNaN(number)) {
              studentsObj[number] = { name, phone }
            }
          }
        })
      }

      if (currentClass) {
        // Edit existing
        await set(ref(db, `schools/${schoolId}/classes/${currentClass.id}`), {
          name: className,
          students: studentsObj
        })
        toast.success('Turma atualizada com sucesso!')
      } else {
        // Create new
        const newClassRef = push(ref(db, `schools/${schoolId}/classes`))
        await set(newClassRef, {
          name: className,
          students: studentsObj
        })
        toast.success('Turma criada com sucesso!')
      }
      
      setIsEditing(false)
      setCurrentClass(null)
      setClassName('')
      setStudents('')
    } catch (error) {
      console.error('Firebase erro:', error?.message || error)
      toast.error('Erro ao salvar turma')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Turmas</h1>
          <p className="text-gray-600 mt-1">Crie turmas e adicione estudantes para a busca ativa.</p>
        </div>
        <button
          onClick={() => {
            setCurrentClass(null)
            setClassName('')
            setStudents('')
            setIsEditing(true)
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          <Plus className="w-5 h-5 mr-1" />
          Nova Turma
        </button>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentClass ? 'Editar Turma' : 'Criar Nova Turma'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Turma</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex: 5º Ano A"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alunos (Formato: Número - Nome - Telefone)
              </label>
              <textarea
                value={students}
                onChange={(e) => setStudents(e.target.value)}
                placeholder="Exemplo:\n1 - João Silva - 11999999999\n2 - Maria Souza - 11888888888"
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Adicione um aluno por linha. O número da chamada e o nome são obrigatórios. O telefone (WhatsApp) é opcional, mas necessário para o envio da mensagem. Não use caracteres como hífen no telefone, apenas números.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                <Save className="w-5 h-5 mr-2" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500">Buscando turmas...</div>
          ) : classes.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">Nenhuma turma cadastrada</h3>
              <p className="text-gray-500 mb-4">Comece adicionando sua primeira turma.</p>
              <button
                onClick={() => {
                  setCurrentClass(null)
                  setClassName('')
                  setStudents('')
                  setIsEditing(true)
                }}
                className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100"
              >
                <Plus className="w-5 h-5 mr-1" />
                Criar Primeira Turma
              </button>
            </div>
          ) : (
            classes.map(cls => (
              <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-primary-300 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mr-3">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500">
                        {cls.students ? Object.keys(cls.students).length : 0} alunos cadastrados
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(cls)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded text-sm hover:bg-gray-100"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    className="flex-none p-2 bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100"
                    title="Excluir turma"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default ManageClasses
