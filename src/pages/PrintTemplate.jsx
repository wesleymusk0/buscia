import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useClasses } from '../hooks/useFirebase'
import {
  Printer,
  Download,
  Users,
  Grid3X3,
  ChevronLeft,
  Check,
  AlertCircle
} from 'lucide-react'

function PrintTemplate() {
  const { userData } = useAuth()
  const schoolId = userData?.schoolId || 'demo_school'
  const { classes } = useClasses(schoolId)
  const printRef = useRef()

  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [copies, setCopies] = useState(1)
  const [bubbleSize, setBubbleSize] = useState('medium') // small, medium, large

  const selectedClassData = classes.find(c => c.id === selectedClass)

  // Gerar array de números (1-60 padrão)
  const generateNumbers = () => {
    const numbers = []
    for (let i = 1; i <= 60; i++) {
      numbers.push(i)
    }
    return numbers
  }

  // Agrupar em colunas
  const getGridColumns = () => {
    switch (bubbleSize) {
      case 'small': return 'grid-cols-10'
      case 'large': return 'grid-cols-5'
      default: return 'grid-cols-6'
    }
  }

  const getBubbleClass = () => {
    switch (bubbleSize) {
      case 'small': return 'w-8 h-8 text-xs'
      case 'large': return 'w-16 h-16 text-lg'
      default: return 'w-12 h-12 text-sm'
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    // Carregar html2pdf dinamicamente
    if (!window.html2pdf) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      document.body.appendChild(script)
      
      await new Promise(resolve => {
        script.onload = resolve
      })
    }

    const element = printRef.current
    const opt = {
      margin: 5,
      filename: `gabaritos-${date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    window.html2pdf().set(opt).from(element).save()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Imprimir Gabarito</h1>
          <p className="text-gray-600 mt-1">Gere o papelzinho para o inspetor marcar as faltas</p>
        </div>
        <a
          href="/"
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Voltar
        </a>
      </div>

      {/* Configurações */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 print:hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Grid3X3 className="w-5 h-5 mr-2 text-primary-600" />
          Configurações do Gabarito
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Turma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Turma (opcional)
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas as turmas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade de cópias
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={copies}
              onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Tamanho das bolinhas */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tamanho das bolinhas
          </label>
          <div className="flex gap-2">
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                onClick={() => setBubbleSize(size)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  bubbleSize === size
                    ? 'bg-primary-100 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {size === 'small' && 'Pequeno (60 números)'}
                {size === 'medium' && 'Médio (60 números)'}
                {size === 'large' && 'Grande (30 números)'}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            <Printer className="w-5 h-5 mr-2" />
            Imprimir Gabarito
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            <Download className="w-5 h-5 mr-2" />
            Salvar como PDF
          </button>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Dica para impressão:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Use papel A4</li>
                <li>Desative cabeçalho e rodapé do navegador</li>
                <li>Margens: Mínimas ou Padrão</li>
                <li>Orientação: Retrato</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Preview do Gabarito (área de impressão) */}
      <div className="bg-gray-100 p-4 rounded-xl print:bg-white print:p-0">
        <div ref={printRef} className="flex flex-wrap gap-4 justify-center bg-white print:block">
          {Array.from({ length: copies }).map((_, copyIndex) => (
            <div
              key={copyIndex}
              className="p-4 border-2 border-dashed border-gray-300 print:border-none rounded-xl"
              style={{ width: '95mm', height: '135mm', breakInside: 'avoid', float: 'left', margin: '5mm' }} 
            >
              <div className="bg-white rounded h-full flex flex-col relative overflow-hidden">
                {/* 🌈 Âncoras OMR Cromáticas (Magenta) - Anti-Confusão v4.0 */}
                <div className="absolute top-0 left-0 w-6 h-6 bg-fuchsia-600 rounded-br" data-omr="tl"></div>
                <div className="absolute top-0 right-0 w-6 h-6 bg-fuchsia-600 rounded-bl" data-omr="tr"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 bg-fuchsia-600 rounded-tr" data-omr="bl"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-fuchsia-600 rounded-tl" data-omr="br"></div>

                {/* 🏷️ Identificação (Cabeçalho Reduzido) */}
                <div className="text-center p-2 z-10">
                  <h1 className="text-xs font-bold text-gray-900 border-b border-gray-400 pb-1">FALTAS - {date}</h1>
                  <p className="text-[10px] truncate">{selectedClassData?.name}</p>
                </div>

                {/* 📐 GRADE ABSOLUTA (v4.6) - Geometria Expandida */}
                <div className="absolute inset-x-0" style={{ top: '20%', bottom: '20%' }}>
                   <div className="grid grid-cols-10 h-full gap-2 px-4">
                      {generateNumbers().map((num) => (
                        <div
                          key={num}
                          className={`${bubbleSize === 'small' ? 'w-5 h-5 text-[10px]' : bubbleSize === 'large' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'} flex items-center justify-center border border-gray-900 rounded-sm font-bold text-gray-900 bg-white mx-auto self-center`}
                        >
                          {num}
                        </div>
                      ))}
                   </div>
                </div>

                {/* ✍️ Rodapé Absoluto */}
                <div className="absolute bottom-6 inset-x-4 border-t border-gray-400 pt-1">
                    <span className="text-[9px] text-gray-600">Ass.: _________________________</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .page-break-before {
            page-break-before: always;
          }

          /* Esconde elementos não necessários na impressão */
          nav, header, footer, button, select, input {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default PrintTemplate
