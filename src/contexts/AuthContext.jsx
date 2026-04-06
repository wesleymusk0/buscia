import { createContext, useContext, useState, useEffect } from 'react'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { app, auth, db } from '../lib/firebase'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Buscar dados adicionais do usuário
        try {
          const userRef = ref(db, `users/${user.uid}`)
          const snapshot = await get(userRef)
          if (snapshot.exists()) {
            setUserData(snapshot.val())
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error)
        }
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      toast.success('Login realizado com sucesso!')
      return { success: true, user: result.user }
    } catch (error) {
      let message = 'Erro ao fazer login'
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Email inválido'
          break
        case 'auth/user-disabled':
          message = 'Usuário desativado'
          break
        case 'auth/user-not-found':
          message = 'Usuário não encontrado'
          break
        case 'auth/wrong-password':
          message = 'Senha incorreta'
          break
        default:
          message = error.message
      }
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      toast.success('Logout realizado com sucesso!')
      return { success: true }
    } catch (error) {
      toast.error('Erro ao fazer logout')
      return { success: false, error: error.message }
    }
  }

  const register = async (email, password, name, schoolId) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Atualizar perfil
      await updateProfile(result.user, { displayName: name })

      // Salvar dados adicionais no Realtime Database
      await set(ref(db, `users/${result.user.uid}`), {
        name,
        email,
        schoolId,
        role: 'user',
        createdAt: new Date().toISOString()
      })

      toast.success('Usuário registrado com sucesso!')
      return { success: true, user: result.user }
    } catch (error) {
      let message = 'Erro ao registrar usuário'
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Email já está em uso'
          break
        case 'auth/invalid-email':
          message = 'Email inválido'
          break
        case 'auth/weak-password':
          message = 'Senha muito fraca'
          break
        default:
          message = error.message
      }
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    userData,
    loading,
    login,
    logout,
    register,
    auth,
    db
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { auth, db }
