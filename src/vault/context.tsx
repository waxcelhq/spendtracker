import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LockScreen } from '../pages/LockScreen'
import { loadVault, changePassword, completeReset, createVault, unlockWithPassword, verifyAnswer } from './store'
import { clearSecrets, isAutoLockSuspended } from './session'

const IDLE_MS = 3 * 60 * 1000

export type VaultStatus = 'loading' | 'setup' | 'locked' | 'unlocked'

type VaultContextValue = {
  status: VaultStatus
  question: string
  create: (password: string, question: string, answer: string) => Promise<void>
  unlock: (password: string) => Promise<void>
  verifyRecovery: (answer: string) => Promise<void>
  resetPassword: (password: string) => Promise<void>
  change: (current: string, next: string) => Promise<void>
  lock: () => void
}

const VaultContext = createContext<VaultContextValue | null>(null)

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('loading')
  const [question, setQuestion] = useState('')

  const lock = useCallback(() => {
    clearSecrets()
    setStatus((current) => (current === 'unlocked' ? 'locked' : current))
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadVault().then((vault) => {
      if (cancelled) return
      setQuestion(vault?.question ?? '')
      setStatus(vault ? 'locked' : 'setup')
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status !== 'unlocked') return
    const onHide = () => {
      if (document.visibilityState === 'hidden' && !isAutoLockSuspended()) lock()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [lock, status])

  useEffect(() => {
    if (status !== 'unlocked') return
    let timer = window.setTimeout(lock, IDLE_MS)
    const bump = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(lock, IDLE_MS)
    }
    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    for (const event of events) window.addEventListener(event, bump)
    return () => {
      window.clearTimeout(timer)
      for (const event of events) window.removeEventListener(event, bump)
    }
  }, [lock, status])

  const value = useMemo<VaultContextValue>(
    () => ({
      status,
      question,
      async create(password, nextQuestion, answer) {
        await createVault(password, nextQuestion, answer)
        setQuestion(nextQuestion.trim())
        setStatus('unlocked')
      },
      async unlock(password) {
        await unlockWithPassword(password)
        setStatus('unlocked')
      },
      verifyRecovery: verifyAnswer,
      async resetPassword(password) {
        await completeReset(password)
        setStatus('unlocked')
      },
      change: changePassword,
      lock,
    }),
    [lock, question, status],
  )

  return (
    <VaultContext.Provider value={value}>
      {status === 'unlocked' ? children : <LockScreen />}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const vault = useContext(VaultContext)
  if (!vault) throw new Error('useVault must be used within VaultProvider')
  return vault
}
