import { useEffect, useRef, useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import CheckIcon from '@mui/icons-material/Check'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import AppBar from '@mui/material/AppBar'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListSubheader from '@mui/material/ListSubheader'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useColorScheme } from '@mui/material/styles'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { BackupFile } from '../db/types'
import { PeriodMenu } from './PeriodFilter'
import { downloadBackup, parseBackup, replaceAll } from '../lib/backup'
import { useSchemeColors } from '../theme'
import { useVault } from '../vault/context'
import { resumeAutoLock, suspendAutoLock } from '../vault/session'

function screenTitle(pathname: string): string {
  if (pathname === '/') return 'Overview'
  if (pathname.startsWith('/transactions')) return 'Transactions'
  if (pathname.startsWith('/reports')) return 'Reports'
  if (pathname === '/transaction/new') return 'New transaction'
  if (pathname.startsWith('/transaction/')) return 'Edit transaction'
  if (pathname.startsWith('/categories')) return 'Categories'
  return 'Spend Tracker'
}

function goBack(navigate: ReturnType<typeof useNavigate>) {
  if (window.history.length > 1) navigate(-1)
  else navigate('/')
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const colors = useSchemeColors()
  const vault = useVault()
  const { mode, setMode } = useColorScheme()
  const appearance = mode ?? 'system'
  const fileRef = useRef<HTMLInputElement>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null)
  const [message, setMessage] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)

  useEffect(() => {
    const onFocus = () => resumeAutoLock()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const pushed =
    location.pathname.startsWith('/transaction/') || location.pathname.startsWith('/categories')
  const navValue = location.pathname.startsWith('/transactions')
    ? '/transactions'
    : location.pathname.startsWith('/reports')
      ? '/reports'
      : '/'

  async function onFile(file: File) {
    try {
      const parsed = parseBackup(JSON.parse(await file.text()) as unknown)
      if ('error' in parsed) {
        setMessage(parsed.error)
        return
      }
      setPendingImport(parsed.data)
    } catch {
      setMessage('This file is not a Spend Tracker backup.')
    }
  }

  async function confirmImport() {
    if (!pendingImport) return
    await replaceAll(pendingImport)
    setPendingImport(null)
    setMessage('Import complete.')
  }

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
            {pushed && (
              <IconButton
                color="inherit"
                edge="start"
                aria-label="Back"
                onClick={() => goBack(navigate)}
                sx={{ mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            <Typography variant="h6" component="h1" noWrap sx={{ flexGrow: 1, minWidth: 0, fontSize: 20 }}>
              {screenTitle(location.pathname)}
            </Typography>
            {(location.pathname === '/' || location.pathname.startsWith('/reports')) && <PeriodMenu />}
            {!pushed && (
              <IconButton color="inherit" aria-label="More" onClick={(event) => setMenuAnchor(event.currentTarget)}>
                <MoreVertIcon />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>

        {!pushed && (
          <Box
            component="nav"
            aria-label="Primary"
            sx={{
              pb: 'env(safe-area-inset-bottom)',
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <BottomNavigation
              showLabels
              value={navValue}
              onChange={(_event, value: string) => navigate(value)}
            >
              <BottomNavigationAction label="Overview" value="/" icon={<AccountBalanceWalletOutlinedIcon />} />
              <BottomNavigationAction
                label="Transactions"
                value="/transactions"
                icon={<ReceiptLongOutlinedIcon />}
              />
              <BottomNavigationAction label="Reports" value="/reports" icon={<BarChartOutlinedIcon />} />
            </BottomNavigation>
          </Box>
        )}
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            navigate('/categories')
          }}
        >
          Categories
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            void downloadBackup()
          }}
        >
          Export
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            suspendAutoLock()
            fileRef.current?.click()
          }}
        >
          Import
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            setCurrentPassword('')
            setNextPassword('')
            setConfirmPassword('')
            setPasswordError('')
            setPasswordOpen(true)
          }}
        >
          Change password
        </MenuItem>
        <Divider />
        <ListSubheader>Appearance</ListSubheader>
        {(
          [
            ['system', 'System'],
            ['light', 'Light'],
            ['dark', 'Dark'],
          ] as const
        ).map(([value, label]) => (
          <MenuItem
            key={value}
            selected={appearance === value}
            onClick={() => {
              setMode(value)
              setMenuAnchor(null)
            }}
          >
            <ListItemIcon>{appearance === value ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {label}
          </MenuItem>
        ))}
      </Menu>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          resumeAutoLock()
          if (file) void onFile(file)
        }}
      />

      <Dialog open={passwordOpen} onClose={() => { if (!passwordBusy) setPasswordOpen(false) }}>
        <DialogTitle>Change password</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            type="password"
            label="Current password"
            value={currentPassword}
            error={passwordError !== ''}
            helperText={passwordError || undefined}
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              setPasswordError('')
            }}
            slotProps={{ htmlInput: { autoComplete: 'current-password' } }}
          />
          <TextField
            fullWidth
            type="password"
            label="New password"
            value={nextPassword}
            helperText="At least 8 characters."
            onChange={(event) => {
              setNextPassword(event.target.value)
              setPasswordError('')
            }}
            slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setPasswordError('')
            }}
            slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={passwordBusy} onClick={() => setPasswordOpen(false)}>Cancel</Button>
          <Button
            disabled={passwordBusy}
            onClick={() => {
              if (nextPassword.length < 8) {
                setPasswordError('Enter a password of at least 8 characters.')
                return
              }
              if (nextPassword !== confirmPassword) {
                setPasswordError('Enter the same password in both fields.')
                return
              }
              setPasswordBusy(true)
              void vault
                .change(currentPassword, nextPassword)
                .then(() => {
                  setPasswordOpen(false)
                  setMessage('Password changed.')
                })
                .catch((caught: unknown) => {
                  setPasswordError(caught instanceof Error ? caught.message : 'Try again.')
                })
                .finally(() => setPasswordBusy(false))
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingImport !== null} onClose={() => setPendingImport(null)}>
        <DialogTitle>Import</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This replaces all transactions and categories on this device.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingImport(null)}>Cancel</Button>
          <Button onClick={() => void confirmImport()}>Import</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={message !== ''}
        autoHideDuration={4000}
        onClose={() => setMessage('')}
        message={message}
      />
    </Box>
  )
}
