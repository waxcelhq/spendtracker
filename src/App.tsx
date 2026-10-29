import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { AppShell } from './components/AppShell'
import { PeriodProvider } from './period/PeriodProvider'
import { CategoriesPage } from './pages/CategoriesPage'
import { OverviewPage } from './pages/OverviewPage'
import { ReportsPage } from './pages/ReportsPage'
import { TransactionPage } from './pages/TransactionPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { theme } from './theme'
import { VaultProvider } from './vault/context'

export default function App() {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="system"
      modeStorageKey="spend-tracker-mode"
      colorSchemeStorageKey="spend-tracker-color-scheme"
      disableTransitionOnChange
    >
      <CssBaseline />
      <VaultProvider>
      <BrowserRouter>
        <PeriodProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="transaction/new" element={<TransactionPage />} />
              <Route path="transaction/:id" element={<TransactionPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </PeriodProvider>
      </BrowserRouter>
      </VaultProvider>
    </ThemeProvider>
  )
}
