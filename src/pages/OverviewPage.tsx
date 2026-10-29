import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PeriodFilter } from '../components/PeriodFilter'
import { TransactionList } from '../components/TransactionList'
import { useLedger } from '../db/useLedger'
import { entriesInRange, totalsByCurrency } from '../lib/stats'
import { formatMoney } from '../lib/money'
import { useResolvedPeriod } from '../period/usePeriod'
import { useSchemeColors } from '../theme'

function TotalLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, px: 2, py: 1.25 }}>
      <Typography>{label}</Typography>
      <Typography sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: color ?? 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
}

export function OverviewPage() {
  const colors = useSchemeColors()
  const { entries, categories, ready } = useLedger()
  const { range } = useResolvedPeriod()

  if (!ready || !entries || !categories) return null

  const inPeriod = range ? entriesInRange(entries, range) : []
  const totals = range ? totalsByCurrency(entries, range) : []
  const recent = [...inPeriod].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 5)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PeriodFilter chips={false} />
      {!range ? null : inPeriod.length === 0 ? (
        <EmptyState message="No transactions in this period" />
      ) : (
        <>
          <Paper elevation={1} sx={{ mx: 2, mb: 1 }}>
            {totals.map((item, index) => (
              <Box key={item.currency}>
                {index > 0 && <Divider />}
                <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5 }}>
                  {item.currency}
                </Typography>
                <TotalLine label="Credit" value={formatMoney(item.credit, item.currency)} color={colors.credit} />
                <TotalLine label="Debit" value={formatMoney(item.debit, item.currency)} color={colors.debit} />
                <TotalLine label="Balance" value={formatMoney(item.balance, item.currency)} />
              </Box>
            ))}
          </Paper>
          <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 0.5, color: 'text.secondary' }}>
            Recent
          </Typography>
          <TransactionList entries={recent} categories={categories} grouped={false} />
        </>
      )}
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Button component={RouterLink} to="/transaction/new" variant="contained" fullWidth>
          New transaction
        </Button>
      </Box>
    </Box>
  )
}
