import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { Link as RouterLink } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PeriodFilter } from '../components/PeriodFilter'
import { TransactionList } from '../components/TransactionList'
import { useLedger } from '../db/useLedger'
import { entriesInRange } from '../lib/stats'
import { useResolvedPeriod } from '../period/usePeriod'

export function TransactionsPage() {
  const { entries, categories, ready } = useLedger()
  const { range } = useResolvedPeriod()

  if (!ready || !entries || !categories) return null

  const inPeriod = range ? entriesInRange(entries, range) : []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PeriodFilter />
      {!range ? null : inPeriod.length === 0 ? (
        <EmptyState message="No transactions in this period" />
      ) : (
        <TransactionList entries={inPeriod} categories={categories} grouped />
      )}
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Button component={RouterLink} to="/transaction/new" variant="contained" fullWidth>
          New transaction
        </Button>
      </Box>
    </Box>
  )
}
