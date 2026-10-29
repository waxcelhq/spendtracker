import { useState } from 'react'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { PERIODS, resolveRange } from '../lib/periods'
import { usePeriod } from '../period/usePeriod'

export function PeriodMenu() {
  const period = usePeriod()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const label = PERIODS.find((item) => item.id === period.id)?.label ?? 'Period'

  return (
    <>
      <Button
        color="inherit"
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        aria-label="Period"
        endIcon={<ArrowDropDownIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ flexShrink: 0, minWidth: 0, px: 1, fontWeight: 500 }}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {PERIODS.map((item) => (
          <MenuItem
            key={item.id}
            selected={period.id === item.id}
            onClick={() => {
              period.setId(item.id)
              setAnchor(null)
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export function PeriodFilter({ chips = true }: { chips?: boolean }) {
  const period = usePeriod()
  const invalidCustom = period.id === 'custom' && resolveRange(period) === null

  return (
    <Box>
      {chips && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ overflowX: 'auto', px: 2, py: 1.5, scrollbarWidth: 'none' }}
        >
          {PERIODS.map((item) => {
            const selected = period.id === item.id
            return (
              <Chip
                key={item.id}
                label={item.label}
                clickable
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => period.setId(item.id)}
                sx={{ flexShrink: 0 }}
              />
            )
          })}
        </Stack>
      )}
      {period.id === 'custom' && (
        <Stack spacing={1} sx={{ px: 2, pt: chips ? 0 : 1.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="From"
              type="date"
              size="small"
              fullWidth
              value={period.from}
              onChange={(event) => period.setFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              fullWidth
              value={period.to}
              onChange={(event) => period.setTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          {invalidCustom && (
            <Box component="p" sx={{ m: 0, color: 'error.main', fontSize: 13 }}>
              Choose a start date on or before the end date.
            </Box>
          )}
        </Stack>
      )}
    </Box>
  )
}
