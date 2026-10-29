import { useCallback, useRef, useState } from 'react'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { EmptyState } from '../components/EmptyState'
import { PeriodFilter } from '../components/PeriodFilter'
import { useLedger } from '../db/useLedger'
import type { TransactionType } from '../db/types'
import { formatAxisAmount, formatMoney, toChartNumber } from '../lib/money'
import { categoryTotals, currenciesInRange, timeSeries, type SeriesPoint } from '../lib/stats'
import { useResolvedPeriod } from '../period/usePeriod'
import { useSchemeColors } from '../theme'

function tickInterval(count: number) {
  const step = count <= 7 ? 1 : Math.ceil(count / 6)
  return (value: string, index: number) => value !== '' && (index % step === 0 || index === count - 1)
}

function useChartWidth() {
  const observerRef = useRef<ResizeObserver | null>(null)
  const [width, setWidth] = useState(0)
  const ref = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0]?.contentRect.width ?? 0))
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])
  return { ref, width }
}

function MoneyBars({
  title,
  points,
  currency,
  color,
}: {
  title: string
  points: SeriesPoint[]
  currency: string
  color: string
}) {
  const { ref, width } = useChartWidth()
  return (
    <Box ref={ref}>
      <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
        {title}
      </Typography>
      <BarChart
          hideLegend
          width={width > 0 ? width : undefined}
          height={280}
          grid={{ horizontal: true }}
          xAxis={[{
            scaleType: 'band',
            data: points.map((point) => point.label),
            tickLabelInterval: tickInterval(points.length),
            tickLabelStyle: { fontSize: 11 },
          }]}
          yAxis={[{
            min: 0,
            width: 44,
            valueFormatter: (value: number) => formatAxisAmount(value),
            tickLabelStyle: { fontSize: 11 },
          }]}
          series={[{
            data: points.map((point) => toChartNumber(point.total)),
            color,
            valueFormatter: (value) => formatMoney(value ?? 0, currency),
          }]}
          margin={{ top: 16, right: 20, bottom: 36, left: 4 }}
          slotProps={{ tooltip: { trigger: 'item' } }}
        />
    </Box>
  )
}

export function ReportsPage() {
  const colors = useSchemeColors()
  const { entries, categories, ready } = useLedger()
  const { range, buckets } = useResolvedPeriod()
  const [picked, setPicked] = useState<string | null>(null)
  const [pieType, setPieType] = useState<TransactionType>('debit')

  if (!ready || !entries || !categories) return null
  if (!range) return <PeriodFilter chips={false} />

  const currencies = currenciesInRange(entries, range)
  const currency = picked && currencies.includes(picked)
    ? picked
    : currencies.includes('NGN')
      ? 'NGN'
      : currencies[0]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PeriodFilter chips={false} />
      {currencies.length === 0 || !currency ? (
        <EmptyState message="No transactions in this period" />
      ) : (
        <>
          <Box sx={{ px: 2, pb: 1 }}>
            <TextField
              select
              fullWidth
              label="Currency"
              value={currency}
              onChange={(event) => setPicked(event.target.value)}
            >
              {currencies.map((code) => (
                <MenuItem key={code} value={code}>
                  {code}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ px: 2, pt: 1 }}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={pieType}
              aria-label="Category totals"
              onChange={(_event, value: TransactionType | null) => {
                if (value) setPieType(value)
              }}
            >
              <ToggleButton value="credit">Credit</ToggleButton>
              <ToggleButton value="debit">Debit</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
            Categories
          </Typography>
          <CategoryPie entries={entries} categories={categories} range={range} currency={currency} type={pieType} />

          <MoneyBars
            title="Credit"
            color={colors.credit}
            currency={currency}
            points={timeSeries(entries, buckets, currency, 'credit')}
          />
          <MoneyBars
            title="Debit"
            color={colors.debit}
            currency={currency}
            points={timeSeries(entries, buckets, currency, 'debit')}
          />
        </>
      )}
    </Box>
  )
}

function CategoryPie({
  entries,
  categories,
  range,
  currency,
  type,
}: {
  entries: NonNullable<ReturnType<typeof useLedger>['entries']>
  categories: NonNullable<ReturnType<typeof useLedger>['categories']>
  range: NonNullable<ReturnType<typeof useResolvedPeriod>['range']>
  currency: string
  type: TransactionType
}) {
  const colors = useSchemeColors()
  const { ref, width } = useChartWidth()
  const slices = categoryTotals(entries, range, currency, type, categories)
  if (slices.length === 0) {
    return (
      <Typography sx={{ px: 2, py: 2, color: 'text.secondary' }}>
        {type === 'credit' ? 'No credits in this period' : 'No debits in this period'}
      </Typography>
    )
  }

  return (
    <Box ref={ref}>
    <PieChart
      width={width > 0 ? width : undefined}
      height={320}
      series={[{
        data: slices.map((slice, index) => ({
          id: slice.id,
          value: toChartNumber(slice.total),
          label: slice.label,
          color: colors.chart[index % colors.chart.length],
        })),
        valueFormatter: (item) => formatMoney(item.value, currency),
        arcLabelMinAngle: 360,
      }]}
      slotProps={{
        legend: {
          direction: 'horizontal',
          position: { vertical: 'bottom', horizontal: 'center' },
        },
      }}
    />
    </Box>
  )
}
