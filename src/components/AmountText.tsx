import Box from '@mui/material/Box'
import type { TransactionType } from '../db/types'
import { formatMoney } from '../lib/money'
import { useSchemeColors } from '../theme'

export function AmountText({
  amount,
  currency,
  type,
}: {
  amount: string
  currency: string
  type?: TransactionType
}) {
  const colors = useSchemeColors()
  const color = type === 'credit' ? colors.credit : type === 'debit' ? colors.debit : 'text.primary'
  return (
    <Box
      component="span"
      sx={{ color, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
    >
      {formatMoney(amount, currency)}
    </Box>
  )
}
