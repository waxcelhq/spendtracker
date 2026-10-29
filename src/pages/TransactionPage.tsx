import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { useLedger } from '../db/useLedger'
import type { TransactionType } from '../db/types'
import { readEntry, writeEntry } from '../vault/store'
import { db } from '../db/db'
import { createCategory } from '../lib/categories'
import { currencyOption, currencyOptions } from '../lib/currencies'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../lib/dates'
import { amountCaret, formatAmountFixed, formatAmountInput, parseAmount } from '../lib/money'

function CurrencyMark({ code }: { code: string }) {
  const option = currencyOption(code)
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, lineHeight: 1 }}>
      {option.flag ? (
        <Box component="span" aria-hidden sx={{ fontSize: 18 }}>
          {option.flag}
        </Box>
      ) : null}
      <span>{option.code}</span>
    </Box>
  )
}

export function TransactionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const existing = useLiveQuery(async () => {
    if (!id) return null
    return readEntry(id)
  }, [id])
  const { categories } = useLedger()

  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('debit')
  const [currency, setCurrency] = useState('NGN')
  const [narration, setNarration] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [occurredLocal, setOccurredLocal] = useState(() => toDatetimeLocalValue(new Date().toISOString()))
  const [amountError, setAmountError] = useState('')
  const [dateError, setDateError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const hydrated = useRef(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!existing || hydrated.current) return
    hydrated.current = true
    setAmount(formatAmountFixed(existing.amount, existing.currency))
    setType(existing.type)
    setCurrency(existing.currency)
    setNarration(existing.narration)
    setCategoryId(existing.categoryId ?? '')
    setOccurredLocal(toDatetimeLocalValue(existing.occurredAt))
  }, [existing])

  if (id && existing === undefined) return null
  if (id && existing === null) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Transaction not found</Typography>
      </Box>
    )
  }

  async function save() {
    const parsed = parseAmount(amount)
    if (!parsed) {
      setAmountError('Enter an amount greater than zero.')
      return
    }
    const occurredAt = fromDatetimeLocalValue(occurredLocal)
    if (!occurredAt) {
      setDateError('Enter a transaction date.')
      return
    }
    const known = new Set((categories ?? []).map((category) => category.id))
    await writeEntry({
      id: existing?.id ?? crypto.randomUUID(),
      type,
      amount: parsed.toString(),
      currency,
      narration: narration.trim(),
      categoryId: categoryId && known.has(categoryId) ? categoryId : null,
      occurredAt,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    })
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  async function remove() {
    if (!existing) return
    await db.entries.delete(existing.id)
    navigate('/transactions', { replace: true })
  }

  async function addCategory() {
    const result = await createCategory(categoryName)
    if ('error' in result) {
      setCategoryError(result.error)
      return
    }
    setCategoryId(result.category.id)
    setCategoryName('')
    setCategoryError('')
    setCategoryOpen(false)
  }

  const listed = currencyOptions()
  const options = listed.some((option) => option.code === currency) ? listed : [...listed, currencyOption(currency)]

  function onAmountChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    const selection = event.target.selectionStart ?? raw.length
    const formatted = formatAmountInput(raw, currency)
    setAmount(formatted)
    setAmountError('')
    const caret = amountCaret(formatted, raw.slice(0, selection).replace(/[^\d]/g, '').length, raw[selection - 1] === '.')
    requestAnimationFrame(() => amountRef.current?.setSelectionRange(caret, caret))
  }

  function onCurrencyChange(next: string) {
    setCurrency(next)
    setAmount((current) => (current ? formatAmountFixed(current, next) : current))
  }

  return (
    <Box
      component="form"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: 2 }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          select
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value)}
          sx={{ width: 120, flexShrink: 0 }}
          slotProps={{
            htmlInput: { 'aria-label': 'Currency' },
            select: {
              renderValue: (value) => <CurrencyMark code={String(value)} />,
              MenuProps: {
                slotProps: { paper: { sx: { minWidth: 140 } } },
              },
            },
          }}
        >
          {options.map((option) => (
            <MenuItem key={option.code} value={option.code} aria-label={option.code}>
              <CurrencyMark code={option.code} />
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Amount"
          value={amount}
          autoFocus={isNew}
          fullWidth
          error={amountError !== ''}
          helperText={amountError}
          onChange={onAmountChange}
          inputRef={amountRef}
          slotProps={{
            htmlInput: {
              inputMode: 'decimal',
              onBlur: (event: FocusEvent<HTMLInputElement>) => {
                const next = formatAmountFixed(event.currentTarget.value, currency)
                if (next) setAmount(next)
              },
            },
          }}
          sx={{ '& .MuiInputBase-input': { fontVariantNumeric: 'tabular-nums' } }}
        />
      </Box>

      <RadioGroup
        row
        value={type}
        aria-label="Transaction type"
        onChange={(event) => setType(event.target.value as TransactionType)}
      >
        <FormControlLabel value="credit" control={<Radio />} label="Credit" />
        <FormControlLabel value="debit" control={<Radio />} label="Debit" />
      </RadioGroup>

      <TextField
        label="Narration"
        value={narration}
        onChange={(event) => setNarration(event.target.value)}
      />

      <TextField
        select
        label="Category"
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
      >
        <MenuItem value="">Uncategorized</MenuItem>
        {(categories ?? []).map((category) => (
          <MenuItem key={category.id} value={category.id}>
            {category.name}
          </MenuItem>
        ))}
      </TextField>
      <Button
        type="button"
        onClick={() => {
          setCategoryError('')
          setCategoryOpen(true)
        }}
        sx={{ alignSelf: 'flex-start', mt: -1 }}
      >
        New category
      </Button>

      <TextField
        label="Transaction date"
        type="datetime-local"
        value={occurredLocal}
        error={dateError !== ''}
        helperText={dateError}
        onChange={(event) => {
          setOccurredLocal(event.target.value)
          setDateError('')
        }}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Button type="submit" variant="contained">
        Save
      </Button>
      {!isNew && (
        <Button type="button" color="error" onClick={() => setDeleteOpen(true)}>
          Delete transaction
        </Button>
      )}

      <Dialog open={categoryOpen} onClose={() => setCategoryOpen(false)}>
        <DialogTitle>New category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Category"
            margin="dense"
            value={categoryName}
            error={categoryError !== ''}
            helperText={categoryError}
            onChange={(event) => {
              setCategoryName(event.target.value)
              setCategoryError('')
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryOpen(false)}>Cancel</Button>
          <Button onClick={() => void addCategory()}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete transaction</DialogTitle>
        <DialogContent>
          <Typography>Delete this transaction?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" onClick={() => void remove()}>
            Delete transaction
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
