import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import type { Category, Entry } from '../db/types'
import { formatDayHeading, formatTime } from '../lib/dates'
import { AmountText } from './AmountText'

function titleFor(entry: Entry, categoryName: string | null): string {
  if (entry.narration.trim()) return entry.narration.trim()
  if (categoryName) return categoryName
  return 'No narration'
}

function groupByDay(entries: Entry[]): { key: string; label: string; entries: Entry[] }[] {
  const sorted = [...entries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const groups: { key: string; label: string; entries: Entry[] }[] = []
  for (const entry of sorted) {
    const date = new Date(entry.occurredAt)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const last = groups[groups.length - 1]
    if (!last || last.key !== key) {
      groups.push({ key, label: formatDayHeading(entry.occurredAt), entries: [entry] })
    } else {
      last.entries.push(entry)
    }
  }
  return groups
}

function Row({ entry, categoryName }: { entry: Entry; categoryName: string | null }) {
  const typeLabel = entry.type === 'credit' ? 'Credit' : 'Debit'
  const categoryLabel = categoryName ?? 'Uncategorized'
  return (
    <ListItemButton component={RouterLink} to={`/transaction/${entry.id}`} sx={{ px: 2, py: 1.25 }}>
      <ListItemText
        primary={titleFor(entry, categoryName)}
        secondary={`${typeLabel} · ${categoryLabel} · ${formatTime(entry.occurredAt)}`}
        sx={{
          my: 0,
          '& .MuiListItemText-primary': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
          '& .MuiListItemText-secondary': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      />
      <AmountText amount={entry.amount} currency={entry.currency} type={entry.type} />
    </ListItemButton>
  )
}

export function TransactionList({
  entries,
  categories,
  grouped,
}: {
  entries: Entry[]
  categories: Category[]
  grouped: boolean
}) {
  const names = new Map(categories.map((category) => [category.id, category.name]))
  const nameFor = (entry: Entry) => (entry.categoryId ? (names.get(entry.categoryId) ?? null) : null)

  if (!grouped) {
    const rows = [...entries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    return (
      <List disablePadding>
        {rows.map((entry) => (
          <Row key={entry.id} entry={entry} categoryName={nameFor(entry)} />
        ))}
      </List>
    )
  }

  return (
    <List disablePadding>
      {groupByDay(entries).map((group) => (
        <li key={group.key}>
          <Typography
            variant="caption"
            component="div"
            sx={{ px: 2, pt: 2, pb: 0.5, color: 'text.secondary' }}
          >
            {group.label}
          </Typography>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {group.entries.map((entry) => (
              <li key={entry.id}>
                <Row entry={entry} categoryName={nameFor(entry)} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </List>
  )
}
