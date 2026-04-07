import React, { useState, useEffect, useCallback } from 'react'
import { ref, get, set, onValue, off, push } from 'firebase/database'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'

/**
 * Hook para buscar dados de uma referência
 */
export function useFirebaseData(path, dependencies = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const dataRef = ref(db, path)

    const fetchData = async () => {
      try {
        setLoading(true)
        const snapshot = await get(dataRef)
        setData(snapshot.val())
        setError(null)
      } catch (err) {
        setError(err)
        console.error('Erro ao buscar dados:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, dependencies)

  return { data, loading, error }
}

/**
 * Hook para dados em tempo real
 */
export function useRealtimeData(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dataRef = ref(db, path)

    const unsubscribe = onValue(dataRef, (snapshot) => {
      setData(snapshot.val())
      setLoading(false)
    }, (error) => {
      console.error('Erro em tempo real:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [path])

  return { data, loading }
}

/**
 * Hook para gerenciar turmas
 */
export function useClasses(schoolId) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!schoolId) {
      setLoading(false)
      return
    }

    const classesRef = ref(db, `schools/${schoolId}/classes`)

    const unsubscribe = onValue(classesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const classesArray = Object.entries(data).map(([id, classData]) => ({
          id,
          ...classData
        }))
        setClasses(classesArray)
      } else {
        setClasses([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [schoolId])

  return { classes, loading }
}

/**
 * Hook para enviar faltas
 */
export function useSubmitAbsences() {
  const [submitting, setSubmitting] = useState(false)

  const submitAbsences = useCallback(async (schoolId, classId, students, date = new Date()) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]

    try {
      setSubmitting(true)

      // Salvar na estrutura absences/schoolId/date/classId
      const absencesRef = ref(db, `absences/${schoolId}/${dateStr}/${classId}`)
      await set(absencesRef, {
        students: students.sort((a, b) => a - b),
        submittedAt: new Date().toISOString()
      })

      // Também registrar no histórico da turma
      const historyRef = push(ref(db, `schools/${schoolId}/classes/${classId}/absenceHistory`))
      await set(historyRef, {
        date: dateStr,
        students: students.length,
        submittedAt: new Date().toISOString()
      })

      toast.success(`${students.length} falta(s) registrada(s) com sucesso!`)
      return { success: true }
    } catch (error) {
      console.error('Erro ao enviar faltas:', error)
      toast.error('Erro ao registrar faltas')
      return { success: false, error }
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { submitAbsences, submitting }
}

/**
 * Hook para buscar alunos de uma turma
 */
export function useStudents(schoolId, classId) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!schoolId || !classId) {
      setStudents([])
      setLoading(false)
      return
    }

    const studentsRef = ref(db, `schools/${schoolId}/classes/${classId}/students`)

    const unsubscribe = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const studentsArray = Object.entries(data).map(([number, studentData]) => ({
          number: parseInt(number),
          ...studentData
        }))
        setStudents(studentsArray.sort((a, b) => a.number - b.number))
      } else {
        setStudents([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [schoolId, classId])

  return { students, loading }
}

/**
 * Hook para histórico de faltas
 */
export function useAbsenceHistory(schoolId, limit = 30) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!schoolId) {
      setLoading(false)
      return
    }

    const absencesRef = ref(db, `absences/${schoolId}`)

    const unsubscribe = onValue(absencesRef, (snapshot) => {
      const data = snapshot.val()
      const historyArray = []

      if (data) {
        Object.entries(data).forEach(([date, classes]) => {
          Object.entries(classes).forEach(([classId, classData]) => {
            historyArray.push({
              date,
              classId,
              students: classData.students || [],
              count: classData.students?.length || 0,
              submittedAt: classData.submittedAt
            })
          })
        })
      }

      // Ordenar por data (mais recente primeiro)
      historyArray.sort((a, b) => new Date(b.date) - new Date(a.date))
      setHistory(historyArray.slice(0, limit))
      setLoading(false)
    })

    return () => unsubscribe()
  }, [schoolId, limit])

  return { history, loading }
}

/**
 * Hook para estatísticas
 */
export function useStatistics(schoolId) {
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!schoolId) {
      setLoading(false)
      return
    }

    const absencesRef = ref(db, `absences/${schoolId}`)

    const unsubscribe = onValue(absencesRef, (snapshot) => {
      const data = snapshot.val()
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      let todayCount = 0
      let weekCount = 0
      let monthCount = 0
      let totalCount = 0

      if (data) {
        Object.entries(data).forEach(([date, classes]) => {
          Object.values(classes).forEach((classData) => {
            const count = classData.students?.length || 0
            totalCount += count

            if (date === today) todayCount += count
            if (date >= weekAgo) weekCount += count
            if (date >= monthAgo) monthCount += count
          })
        })
      }

      setStats({
        today: todayCount,
        week: weekCount,
        month: monthCount,
        total: totalCount
      })
      setLoading(false)
    })

    return () => unsubscribe()
  }, [schoolId])

  return { stats, loading }
}
