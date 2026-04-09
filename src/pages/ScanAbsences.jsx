import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useStudents, useSubmitAbsences } from '../hooks/useFirebase'
import {
  Camera, Check, X, RotateCcw, Send, Loader2, ChevronLeft, Sparkles, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

function ScanAbsences() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userData } = useAuth()
  const schoolId = userData?.schoolId || 'demo_school'
  const selectedClass = location.state?.selectedClass
  const { students } = useStudents(schoolId, selectedClass)
  const { submitAbsences, submitting } = useSubmitAbsences()

  const [mode, setMode] = useState('camera')
  const [capturedImage, setCapturedImage] = useState(null)
  const [detectedNumbers, setDetectedNumbers] = useState([])
  const [manualNumbers, setManualNumbers] = useState('')
  const [isBW, setIsBW] = useState(localStorage.getItem('omrModeBW') === 'true')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setMode('camera')
    } catch (e) { toast.error('Erro ao abrir câmera.') }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    stopCamera()
    processImage(canvas)
  }

  // MOTOR OMR v7.0 - HÍBRIDO WARP-HUNTER 🚀🏁⚖️🔬
  const processImage = (canvas) => {
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data

    const getMagentaScore = (x, y) => {
        const idx = (Math.floor(y)*width + Math.floor(x)) * 4
        // Magenta has high Red and Blue, and low Green
        return Math.max(0, (data[idx] + data[idx+2]) / 2 - data[idx+1] * 1.5)
    }

    const getBlackScore = (x, y) => {
        const luma = getLuma(x, y)
        return 255 - luma // Quanto mais escuro (menor luma), maior o score
    }

    const getLuma = (x, y) => {
        const idx = (Math.floor(y)*width + Math.floor(x)) * 4
        if (idx < 0 || idx >= data.length) return 255
        return (data[idx] * 0.29 + data[idx+1] * 0.58 + data[idx+2] * 0.11)
    }

    // 1. Localizar Âncoras Magenta (Cantos do Papel)
    const findAnchor = (minX, minY, maxX, maxY) => {
      let bS = -1, bP = { x: (minX+maxX)/2, y: (minY+maxY)/2 }
      for (let y = minY+15; y < maxY-15; y += 12) {
        for (let x = minX+15; x < maxX-15; x += 12) {
          const s = isBW ? getBlackScore(x, y) : getMagentaScore(x, y)
          if (s > bS) { 
            // Em P&B, queremos garantir que é um ponto sólido, não apenas ruído
            if (isBW && s < 180) continue 
            bS = s; bP = { x, y } 
          }
        }
      }
      return bP
    }
    const pTL = findAnchor(0, 0, width*.4, height*.4)
    const pTR = findAnchor(width*.6, 0, width, height*.4)
    const pBL = findAnchor(0, height*.6, width*.4, height)
    const pBR = findAnchor(width*.6, height*.6, width, height)

    // 2. RETIFICAÇÃO (Warp Perspective) para remover distorção da lente
    const warpW = 800, warpH = 1100
    const warpCanvas = document.createElement('canvas')
    warpCanvas.width = warpW; warpCanvas.height = warpH
    const wCtx = warpCanvas.getContext('2d')
    const wData = wCtx.createImageData(warpW, warpH)

    for (let y = 0; y < warpH; y++) {
        const v = y / (warpH - 1)
        for (let x = 0; x < warpW; x++) {
            const u = x / (warpW - 1)
            const tx1 = pTL.x + u * (pTR.x - pTL.x); const ty1 = pTL.y + u * (pTR.y - pTL.y)
            const tx2 = pBL.x + u * (pBR.x - pBL.x); const ty2 = pBL.y + u * (pBR.y - pBL.y)
            const px = tx1 + v * (tx2 - tx1), py = ty1 + v * (ty2 - ty1)
            const lum = getLuma(px, py)
            const idx = (y * warpW + x) * 4
            wData.data[idx] = wData.data[idx+1] = wData.data[idx+2] = lum
            wData.data[idx+3] = 255
        }
    }
    wCtx.putImageData(wData, 0, 0)

    // 3. RASTREIO FÍSICO INDIVIDUAL NO PLANO RETO (The Hunter)
    const getWarpLuma = (wx, wy) => {
        const idx = (Math.floor(wy) * warpW + Math.floor(wx)) * 4
        if (idx < 0 || idx >= wData.data.length) return 255
        return wData.data[idx]
    }

    const snapToSquare = (wx, wy, radius) => {
        let sX = 0, sY = 0, count = 0
        const thresh = 110
        for (let dy = -radius; dy <= radius; dy += 2) {
            for (let dx = -radius; dx <= radius; dx += 2) {
                if (getWarpLuma(wx + dx, wy + dy) < thresh) {
                    sX += (wx + dx); sY += (wy + dy); count++
                }
            }
        }
        if (count > 15) return { x: sX / count, y: sY / count }
        return { x: wx, y: wy }
    }

    const detected = []
    const COLS = 10, ROWS = 6
    const gSX = 0.08, gEX = 0.92, gSY = 0.20, gEY = 0.80 // Margens no Plano Reto 800x1100

    ctx.textAlign = 'center'
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const studentNumber = row * 10 + col + 1
            if (studentNumber > 60) continue

            // Posição Teórica no Warp
            const u = gSX + (col / (COLS - 1)) * (gEX - gSX)
            const v = gSY + (row / (ROWS - 1)) * (gEY - gSY)
            const wx = u * (warpW - 1), wy = v * (warpH - 1)

            // Rastreio Físico no plano reto
            const physical = snapToSquare(wx, wy, 35)
            
            // Voltar para a coordenada da Foto Real para desenhar o feedback
            const ru = physical.x / (warpW - 1)
            const rv = physical.y / (warpH - 1)
            const tx1 = pTL.x + ru * (pTR.x - pTL.x); const ty1 = pTL.y + ru * (pTR.y - pTL.y)
            const tx2 = pBL.x + ru * (pBR.x - pBL.x); const ty2 = pBL.y + ru * (pBR.y - pBL.y)
            const finalX = tx1 + rv * (tx2 - tx1), finalY = ty1 + rv * (ty2 - ty1)

            // Auditoria de Tinta Local (Bilinear no Warp)
            let ink = 0, localWhite = 0
            for(let i=0; i<4; i++) localWhite += getWarpLuma(physical.x + (i%2?30:-30), physical.y + (i<2?30:-30))
            const localThresh = (localWhite / 4) * 0.50

            for (let dy = -15; dy <= 15; dy += 2) {
                for (let dx = -15; dx <= 15; dx += 2) {
                    if (getWarpLuma(physical.x + dx, physical.y + dy) < localThresh) ink++
                }
            }

            const isMarked = ink > 100 // Tinta sólida da caneta
            if (isMarked) detected.push(studentNumber)

            // Feedback Visual
            ctx.strokeStyle = isMarked ? '#ff00ff' : '#facc15'
            ctx.lineWidth = isMarked ? 3 : 1
            ctx.strokeRect(finalX - 10, finalY - 10, 20, 20)
            ctx.fillStyle = isMarked ? '#ff00ff' : '#facc15'
            ctx.font = 'bold 12px Arial'
            ctx.fillText(studentNumber, finalX, finalY - 14)
        }
    }

    // Desenhar Âncoras Feedback
    ctx.fillStyle = isBW ? '#000000' : '#ff00ff'
    ;[pTL, pTR, pBL, pBR].forEach(p => ctx.fillRect(p.x - 12, p.y - 12, 24, 24))

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.8))
    setDetectedNumbers(detected.sort((a,b)=>a-b))
    setMode('review')
    if (detected.length > 0) toast.success(`${detected.length} faltas lidas!`)
  }

  const addManualNumber = () => {
    const nums = manualNumbers.split(/[,\s]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0 && n <= 60 && !detectedNumbers.includes(n))
    if (nums.length > 0) { setDetectedNumbers(prev => [...prev, ...nums].sort((a,b)=>a-b)); setManualNumbers('') }
  }

  const removeNumber = (num) => setDetectedNumbers(prev => prev.filter(n => n !== num))
  const handleSubmit = async () => {
    if (detectedNumbers.length === 0) return
    const res = await submitAbsences(schoolId, selectedClass, detectedNumbers)
    if (res.success) navigate('/')
  }
  const handleReset = () => { setCapturedImage(null); setMode('camera'); startCamera() }
  const handleBack = () => { stopCamera(); navigate('/') }

  useEffect(() => { startCamera(); return () => stopCamera() }, [])

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto pb-10">
      <div className="flex items-center mb-4">
        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg mr-2"><ChevronLeft /></button>
        <h1 className="text-xl font-bold">Escanear Faltas</h1>
      </div>

      {mode === 'camera' && (
        <div className="bg-gray-900 rounded-xl overflow-hidden aspect-[3/4] relative shadow-2xl">
          <div className="absolute inset-0 border-2 border-fuchsia-500/30 rounded-lg m-6 aspect-[9.5/13.5] mx-auto z-10 pointer-events-none">
             <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-fuchsia-400 font-bold bg-gray-900/80 px-2 py-0.5 rounded">MODO HÍBRIDO WARP-HUNTER v7.0</div>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          
          {/* Seletor Colorido/P&B */}
          <div className="absolute top-4 right-4 z-20 flex bg-black/50 p-1 rounded-lg backdrop-blur-sm border border-white/20">
            <button
               onClick={() => { setIsBW(false); localStorage.setItem('omrModeBW', 'false') }}
               className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${!isBW ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
            >
              CORES
            </button>
            <button
               onClick={() => { setIsBW(true); localStorage.setItem('omrModeBW', 'true') }}
               className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${isBW ? 'bg-white text-black shadow-lg' : 'text-gray-300 hover:text-white'}`}
            >
              P&B (BETA)
            </button>
          </div>

          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
            <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center transition-transform active:scale-95"><div className="w-12 h-12 rounded-full border-4 border-gray-900" /></button>
          </div>
        </div>
      )}

      {mode === 'review' && (
        <div className="space-y-4">
          <div className="bg-black rounded-xl overflow-hidden aspect-[3/4] border-4 border-fuchsia-600 shadow-2xl"><img src={capturedImage} className="w-full h-full object-contain" /></div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-2">
            <input type="text" value={manualNumbers} onChange={(e) => setManualNumbers(e.target.value)} placeholder="Extras: 5, 12..." className="flex-1 px-4 py-2 border rounded-lg" />
            <button onClick={addManualNumber} className="px-4 py-2 bg-gray-900 text-white rounded-lg"><Check /></button>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between mb-4"><span className="font-medium text-gray-900">Alunos Faltantes ({detectedNumbers.length})</span><button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700 flex items-center"><RotateCcw className="w-4 h-4 mr-1" />Refazer</button></div>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {detectedNumbers.map((num) => (
                <button key={num} onClick={() => removeNumber(num)} className="group relative p-3 bg-fuchsia-50 rounded-lg hover:bg-red-50 transition-colors">
                  <span className="font-bold text-fuchsia-700 group-hover:text-red-700">{num}</span>
                  <X className="absolute top-1 right-1 w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 bg-fuchsia-600 text-white rounded-xl font-bold shadow-lg hover:bg-fuchsia-700 transition-all flex items-center justify-center">
            <Send className="mr-2 w-5 h-5" /> CONFIRMAR FALTAS
          </button>
        </div>
      )}
    </div>
  )
}

export default ScanAbsences
