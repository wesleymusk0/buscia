import { useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'

/**
 * Hook para processamento de imagem com OpenCV.js
 * Detecta círculos preenchidos em gabaritos
 */
export function useImageProcessor() {
  const [processing, setProcessing] = useState(false)
  const [detectedNumbers, setDetectedNumbers] = useState([])
  const [debugImage, setDebugImage] = useState(null)
  const canvasRef = useRef(null)

  /**
   * Processa a imagem e detecta bolinhas marcadas
   */
  const processImage = useCallback(async (imageElement, canvas) => {
    if (!window.cv) {
      toast.error('OpenCV.js não está carregado. Aguarde um momento e tente novamente.')
      return []
    }

    setProcessing(true)
    const detected = []

    try {
      const cv = window.cv

      // Ler imagem
      const src = cv.imread(imageElement)
      const dst = new cv.Mat()
      const gray = new cv.Mat()
      const blurred = new cv.Mat()
      const thresh = new cv.Mat()

      // Converter para escala de cinza
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

      // Aplicar blur para reduzir ruído
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

      // Aplicar threshold
      cv.adaptiveThreshold(
        blurred,
        thresh,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        11,
        2
      )

      // Detectar círculos usando HoughCircles
      const circles = new cv.Mat()
      cv.HoughCircles(
        thresh,
        circles,
        cv.HOUGH_GRADIENT,
        1,
        20,      // minDist entre círculos
        50,      // param1 (threshold do Canny)
        20,      // param2 (threshold do acumulador)
        10,      // minRadius
        40       // maxRadius
      )

      // Processar círculos detectados
      const bubbleData = []
      for (let i = 0; i < circles.cols; i++) {
        const x = circles.data32F[i * 3]
        const y = circles.data32F[i * 3 + 1]
        const radius = circles.data32F[i * 3 + 2]

        // Verificar preenchimento
        const isFilled = checkBubbleFilled(gray, x, y, radius, cv)

        bubbleData.push({
          x,
          y,
          radius,
          filled: isFilled,
          number: i + 1
        })
      }

      // Ordenar por posição (esquerda para direita, cima para baixo)
      bubbleData.sort((a, b) => {
        const rowA = Math.round(a.y / 50)
        const rowB = Math.round(b.y / 50)
        if (rowA !== rowB) return rowA - rowB
        return a.x - b.x
      })

      // Atribuir números corretos baseado na ordenação
      bubbleData.forEach((bubble, index) => {
        bubble.number = index + 1
        if (bubble.filled && index < 60) {
          detected.push(index + 1)
        }
      })

      // Desenhar resultado no canvas de debug
      cv.cvtColor(thresh, dst, cv.COLOR_GRAY2RGBA)
      drawResults(dst, bubbleData, cv)
      cv.imshow(canvas, dst)
      setDebugImage(canvas.toDataURL())

      // Limpar
      src.delete()
      dst.delete()
      gray.delete()
      blurred.delete()
      thresh.delete()
      circles.delete()

      setDetectedNumbers(detected)
      return detected

    } catch (error) {
      console.error('Erro no processamento:', error)
      toast.error('Erro ao processar imagem')
      return []
    } finally {
      setProcessing(false)
    }
  }, [])

  /**
   * Verifica se uma bolinha está preenchida
   */
  const checkBubbleFilled = (grayImage, cx, cy, radius, cv) => {
    const innerRadius = radius * 0.6
    const mask = new cv.Mat(grayImage.rows, grayImage.cols, cv.CV_8UC1, new cv.Scalar(0))

    // Criar máscara circular
    const center = new cv.Point(cx, cy)
    cv.circle(mask, center, innerRadius, new cv.Scalar(255), -1)

    // Calcular média de pixels dentro do círculo
    const mean = cv.mean(grayImage, mask)
    mask.delete()

    // Se média < 128, considerar preenchido (escuro)
    return mean[0] < 128
  }

  /**
   * Desenha resultados no canvas
   */
  const drawResults = (image, bubbles, cv) => {
    for (const bubble of bubbles) {
      const center = new cv.Point(bubble.x, bubble.y)
      const color = bubble.filled
        ? new cv.Scalar(0, 255, 0, 255)   // Verde para preenchido
        : new cv.Scalar(255, 0, 0, 255) // Vermelho para vazio

      // Desenhar círculo
      cv.circle(image, center, bubble.radius, color, 2)

      // Desenhar número
      cv.putText(
        image,
        String(bubble.number),
        new cv.Point(bubble.x - 5, bubble.y + 5),
        cv.FONT_HERSHEY_SIMPLEX,
        0.4,
        new cv.Scalar(0, 0, 255, 255),
        1
      )
    }
  }

  /**
   * Método alternativo: detecção por grade
   */
  const processGrid = useCallback(async (imageElement, rows = 6, cols = 10) => {
    if (!window.cv) {
      toast.error('OpenCV.js não está carregado')
      return []
    }

    setProcessing(true)
    const detected = []

    try {
      const cv = window.cv
      const src = cv.imread(imageElement)
      const gray = new cv.Mat()
      const thresh = new cv.Mat()

      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
      cv.threshold(gray, thresh, 150, 255, cv.THRESH_BINARY_INV)

      const width = src.cols
      const height = src.rows
      const cellWidth = width / cols
      const cellHeight = height / rows

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const number = row * cols + col + 1
          if (number > 60) break

          const x = col * cellWidth + cellWidth / 2
          const y = row * cellHeight + cellHeight / 2
          const radius = Math.min(cellWidth, cellHeight) * 0.35

          const isFilled = checkBubbleFilled(gray, x, y, radius, cv)

          if (isFilled) {
            detected.push(number)
          }
        }
      }

      src.delete()
      gray.delete()
      thresh.delete()

      setDetectedNumbers(detected)
      return detected

    } catch (error) {
      console.error('Erro no processamento:', error)
      toast.error('Erro ao processar imagem')
      return []
    } finally {
      setProcessing(false)
    }
  }, [])

  return {
    processing,
    detectedNumbers,
    debugImage,
    processImage,
    processGrid,
    setDetectedNumbers
  }
}

/**
 * Hook para captura de câmera
 */
import { useState, useRef } from 'react'

export function useCamera() {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const videoRef = useRef(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setStream(mediaStream)
      setError(null)
    } catch (err) {
      setError('Não foi possível acessar a câmera')
      toast.error('Erro ao acessar câmera: ' + err.message)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const capture = useCallback(() => {
    if (!videoRef.current) return null

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    return canvas.toDataURL('image/jpeg')
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    videoRef,
    stream,
    error,
    startCamera,
    stopCamera,
    capture
  }
}
