import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ref, update } from 'firebase/database'
import { updateProfile } from 'firebase/auth'
import {
  User,
  School,
  Bell,
  Shield,
  MessageSquare,
  Save,
  Loader2,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

function Settings() {
  const { user, userData, db } = useAuth()
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState({
    messageTemplate: localStorage.getItem('messageTemplate') ||
      'Olá, responsável por {nomeAluno}. Identificamos que o aluno não compareceu à escola hoje. Pedimos que verifique a situação e, se possível, justifique a ausência.',
    notifyEmail: false,
    dailyDigest: false
  })

  const [profile, setProfile] = useState({
    name: '',
    schoolId: ''
  })

  useEffect(() => {
    if (userData || user) {
      setSettings(s => ({
        ...s,
        notifyEmail: userData?.notifyEmail || false,
        dailyDigest: userData?.dailyDigest || false
      }))
      setProfile({
        name: user?.displayName || userData?.name || '',
        schoolId: userData?.schoolId || ''
      })
    }
  }, [user, userData])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Salvar no localStorage
      localStorage.setItem('messageTemplate', settings.messageTemplate)

      // Salvar no Firebase
      if (user) {
        if (profile.name !== user.displayName) {
          await updateProfile(user, { displayName: profile.name })
        }

        const userRef = ref(db, `users/${user.uid}`)
        await update(userRef, {
          name: profile.name,
          schoolId: profile.schoolId,
          notifyEmail: settings.notifyEmail,
          dailyDigest: settings.dailyDigest,
          updatedAt: new Date().toISOString()
        })
      }

      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Personalize o sistema</p>
      </div>

      {/* Perfil */}
      <Section title="Perfil" icon={User}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              title="Para alterar o email, entre em contato com o suporte."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Escola
            </label>
            <input
              type="text"
              value={profile.schoolId}
              onChange={(e) => setProfile(p => ({ ...p, schoolId: e.target.value }))}
              placeholder="Nome ou código da escola"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Função
            </label>
            <input
              type="text"
              value={userData?.role === 'admin' ? 'Administrador' : 'Usuário'}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
        </div>
      </Section>

      {/* Mensagem */}
      <Section title="Mensagem Padrão" icon={MessageSquare}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template da Mensagem
          </label>
          <textarea
            value={settings.messageTemplate}
            onChange={(e) => setSettings(s => ({ ...s, messageTemplate: e.target.value }))}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Digite o template da mensagem..."
          />
          <p className="mt-2 text-sm text-gray-500">
            Use {'{nomeAluno}'} para inserir o nome do aluno automaticamente.
          </p>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização:</p>
            <p className="text-sm text-gray-600">
              {settings.messageTemplate.replace('{nomeAluno}', 'João Silva')}
            </p>
          </div>
        </div>
      </Section>

      {/* Notificações */}
      <Section title="Notificações" icon={Bell}>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notifyEmail}
              onChange={(e) => setSettings(s => ({ ...s, notifyEmail: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-3 text-sm text-gray-700">
              Receber notificações por email
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.dailyDigest}
              onChange={(e) => setSettings(s => ({ ...s, dailyDigest: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-3 text-sm text-gray-700">
              Resumo diário de faltas
            </span>
          </label>
        </div>
      </Section>

      {/* Segurança */}
      <Section title="Segurança" icon={Shield}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Alterar Senha</p>
              <p className="text-sm text-gray-500">Atualize sua senha periodicamente</p>
            </div>
            <button
              onClick={() => toast.info('Funcionalidade em desenvolvimento')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Alterar
            </button>
          </div>
        </div>
      </Section>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default Settings
