import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ref, set, get } from 'firebase/database'
import { db } from '../lib/firebase'
import {
  MessageSquare,
  Smartphone,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Copy,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

function FirstSetup() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected') // disconnected, connecting, connected
  const [agentConfigured, setAgentConfigured] = useState(false)
  const [qrCode, setQrCode] = useState(null)

  const [config, setConfig] = useState({
    messageTemplate: 'Olá, responsável por {nomeAluno}. Identificamos que o aluno não compareceu à escola hoje. Pedimos que verifique a situação e, se possível, justifique a ausência.',
    schoolName: ''
  })

  // Verificar se já está configurado
  useEffect(() => {
    if (userData?.isConfigured) {
      navigate('/')
    }
  }, [userData, navigate])

  // Verificar status do WhatsApp
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Sempre buscar o servidor na máquina local (localhost), 
        // independente de onde o site esteja hospedado.
        const response = await fetch(`http://localhost:3001/health`)
        const data = await response.json()
        setWhatsappStatus(data.whatsapp || (data.status === 'ok' ? 'connecting' : 'disconnected'))
        setAgentConfigured(data.configured)
        if (data.qr) setQrCode(data.qr)
      } catch (e) {
        // Servidor ainda não está rodando ou não tem endpoint
      }
    }

    if (step === 2) {
      checkStatus()
      const interval = setInterval(checkStatus, 3000)
      return () => clearInterval(interval)
    }
  }, [step])

  const pairAgent = async () => {
    const schoolId = userData?.schoolId || user?.uid
    if (!schoolId) {
      toast.error('Não foi possível encontrar o ID da escola ou usuário')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId })
      })
      const data = await response.json()
      if (data.success) {
        setAgentConfigured(true)
        toast.success('Agente vinculado com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao vincular agente local')
      }
    } catch (e) {
      toast.error('Erro ao conectar com o agente local. Verifique se ele está rodando.')
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    setLoading(true)
    try {
      const userRef = ref(db, `users/${user.uid}`)

      await set(userRef, {
        ...userData,
        messageTemplate: config.messageTemplate,
        schoolName: config.schoolName,
        isConfigured: true,
        configuredAt: new Date().toISOString()
      })

      toast.success('Configuração salva com sucesso!')
      navigate('/')
    } catch (error) {
      toast.error('Erro ao salvar configuração')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Mensagem', icon: MessageSquare },
    { number: 2, title: 'WhatsApp', icon: Smartphone },
    { number: 3, title: 'Pronto', icon: CheckCircle }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header com progresso */}
        <div className="bg-primary-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white mb-4">
            Configuração Inicial
          </h1>
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= s.number
                    ? 'bg-white text-primary-600'
                    : 'bg-primary-400 text-primary-100'
                }`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step >= s.number ? 'text-white' : 'text-primary-200'
                }`}>
                  {s.title}
                </span>
                {index < steps.length - 1 && (
                  <div className="w-12 h-0.5 mx-4 bg-primary-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Configure a Mensagem Padrão
                </h2>
                <p className="text-gray-600">
                  Esta mensagem será enviada automaticamente para os responsáveis.
                  Use {'{nomeAluno}'} onde o nome deve aparecer.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Escola
                </label>
                <input
                  type="text"
                  value={config.schoolName}
                  onChange={(e) => setConfig(c => ({ ...c, schoolName: e.target.value }))}
                  placeholder="Ex: Escola Municipal João Silva"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem Padrão
                </label>
                <textarea
                  value={config.messageTemplate}
                  onChange={(e) => setConfig(c => ({ ...c, messageTemplate: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Pré-visualização:</p>
                  <p className="text-gray-900">
                    {config.messageTemplate.replace('{nomeAluno}', 'Maria Silva')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Conecte o WhatsApp
                </h2>
                <p className="text-gray-600">
                  O servidor está {whatsappStatus === 'connected' ? 'conectado' : 'aguardando conexão'}.
                </p>
              </div>

              {!agentConfigured && whatsappStatus !== 'disconnected' && (
                <div className="p-6 bg-primary-50 rounded-lg border border-primary-200 mb-6">
                  <h3 className="text-lg font-medium text-primary-800 mb-2">
                    Vincular este computador?
                  </h3>
                  <p className="text-primary-600 mb-4 text-sm">
                    Detectamos o Agente Local, mas ele ainda não sabe a qual escola pertence.
                  </p>
                  <button
                    onClick={pairAgent}
                    disabled={loading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {loading ? 'Vinculando...' : 'Vincular a esta Escola'}
                  </button>
                </div>
              )}

              {whatsappStatus === 'disconnected' && (
                <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 mb-4">
                    Verifique se o servidor está rodando no computador.
                  </p>
                  <p className="text-sm text-yellow-700">
                    Terminal deve mostrar "Servidor rodando na porta 3001"
                  </p>
                </div>
              )}

              {whatsappStatus === 'connecting' && qrCode && (
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Abra o WhatsApp no seu celular e escaneie o QR Code:
                  </p>
                  <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <img
                      src={qrCode}
                      alt="QR Code WhatsApp"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Aguardando conexão...
                  </p>
                </div>
              )}

              {whatsappStatus === 'connected' && (
                <div className="p-6 bg-success-50 rounded-lg border border-success-200">
                  <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-success-800">
                    WhatsApp Conectado!
                  </h3>
                  <p className="text-success-600 mt-2">
                    O sistema está pronto para enviar mensagens.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-success-500 mx-auto" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Tudo Pronto!
              </h2>
              <p className="text-gray-600">
                O sistema está configurado e pronto para uso.
                <br />
                Na próxima vez que você acessar, irá direto para o painel.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="font-medium text-gray-900 mb-2">Resumo:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>✓ Escola: {config.schoolName}</li>
                  <li>✓ Mensagem configurada</li>
                  <li>✓ WhatsApp conectado</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer com navegação */}
        <div className="px-8 py-6 bg-gray-50 border-t flex justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Voltar
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && (!config.schoolName || !config.messageTemplate)}
              className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Próximo
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          ) : (
            <button
              onClick={saveConfiguration}
              disabled={loading}
              className="flex items-center px-6 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Começar a Usar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FirstSetup
