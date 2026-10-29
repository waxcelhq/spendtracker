import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useSchemeColors } from '../theme'
import { normalizeAnswer } from '../vault/crypto'
import { useVault } from '../vault/context'
import { setPendingDek } from '../vault/session'

const MIN_PASSWORD = 8

function passwordError(password: string, confirm: string): string {
  if (password.length < MIN_PASSWORD) return 'Enter a password of at least 8 characters.'
  if (password !== confirm) return 'Enter the same password in both fields.'
  return ''
}

export function LockScreen() {
  const colors = useSchemeColors()
  const vault = useVault()
  const setup = vault.status === 'setup'
  const [mode, setMode] = useState<'password' | 'question' | 'reset'>('password')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [confirmAnswer, setConfirmAnswer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  function submitSetup() {
    const nextPasswordError = passwordError(password, confirm)
    if (nextPasswordError) {
      setError(nextPasswordError)
      return
    }
    if (!question.trim()) {
      setError('Enter a recovery question.')
      return
    }
    if (!answer.trim()) {
      setError('Enter an answer.')
      return
    }
    if (normalizeAnswer(answer) !== normalizeAnswer(confirmAnswer)) {
      setError('Enter the same answer in both fields.')
      return
    }
    void run(() => vault.create(password, question, answer))
  }

  function submitUnlock() {
    if (!password) {
      setError('Enter your password.')
      return
    }
    void run(() => vault.unlock(password))
  }

  function submitAnswer() {
    if (!answer.trim()) {
      setError('Enter an answer.')
      return
    }
    void run(async () => {
      await vault.verifyRecovery(answer)
      setPassword('')
      setConfirm('')
      setMode('reset')
    })
  }

  function submitReset() {
    const nextPasswordError = passwordError(password, confirm)
    if (nextPasswordError) {
      setError(nextPasswordError)
      return
    }
    void run(() => vault.resetPassword(password))
  }

  const title = setup ? 'Set a password' : mode === 'reset' ? 'New password' : mode === 'question' ? 'Reset password' : 'Unlock'

  return (
    <Box sx={{ height: '100dvh', bgcolor: colors.frame, overflow: 'hidden' }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          height: '100dvh',
          mx: 'auto',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="h1" sx={{ fontSize: 20 }}>
              Spend Tracker
            </Typography>
          </Toolbar>
        </AppBar>
        {vault.status === 'loading' ? null : !window.isSecureContext ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }}>
            <Typography>Open this app over HTTPS.</Typography>
          </Box>
        ) : (
          <Box
            component="form"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault()
              if (setup) submitSetup()
              else if (mode === 'question') submitAnswer()
              else if (mode === 'reset') submitReset()
              else submitUnlock()
            }}
            sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}
          >
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
            {setup && (
              <Typography color="text.secondary">
                Choose a password and a recovery question. They stay on this device.
              </Typography>
            )}
            {mode === 'question' && <Typography>{vault.question}</Typography>}

            {(setup || mode === 'password' || mode === 'reset') && (
              <TextField
                autoFocus
                fullWidth
                type="password"
                label={mode === 'reset' ? 'New password' : 'Password'}
                value={password}
                helperText={setup || mode === 'reset' ? 'At least 8 characters.' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
                slotProps={{ htmlInput: { autoComplete: setup || mode === 'reset' ? 'new-password' : 'current-password' } }}
              />
            )}
            {(setup || mode === 'reset') && (
              <TextField
                fullWidth
                type="password"
                label="Confirm password"
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value)
                  setError('')
                }}
                slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
              />
            )}
            {setup && (
              <TextField
                fullWidth
                label="Recovery question"
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value)
                  setError('')
                }}
              />
            )}
            {(setup || mode === 'question') && (
              <TextField
                autoFocus={mode === 'question'}
                fullWidth
                label="Answer"
                value={answer}
                helperText={setup || mode === 'question' ? 'Capitalization does not matter.' : undefined}
                onChange={(event) => {
                  setAnswer(event.target.value)
                  setError('')
                }}
                slotProps={{ htmlInput: { autoComplete: 'off' } }}
              />
            )}
            {setup && (
              <TextField
                fullWidth
                label="Confirm answer"
                value={confirmAnswer}
                onChange={(event) => {
                  setConfirmAnswer(event.target.value)
                  setError('')
                }}
                slotProps={{ htmlInput: { autoComplete: 'off' } }}
              />
            )}

            {error !== '' && <Typography color="error">{error}</Typography>}
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? 'Checking…' : setup ? 'Continue' : mode === 'question' ? 'Check answer' : mode === 'reset' ? 'Save password' : 'Unlock'}
            </Button>
            {!setup && mode === 'password' && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode('question')
                  setAnswer('')
                  setError('')
                }}
              >
                Forgot password
              </Button>
            )}
            {!setup && mode !== 'password' && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingDek(null)
                  setMode('password')
                  setPassword('')
                  setConfirm('')
                  setAnswer('')
                  setError('')
                }}
              >
                Back
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
