import type { BackupFile, Category, Entry, TransactionType } from '../db/types'
import { parseAmount } from './money'
import { readCategories, readEntries, replaceLedger } from '../vault/store'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function readCategory(value: unknown): Category | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || value.id.length === 0) return null
  if (typeof value.name !== 'string' || value.name.trim().length === 0) return null
  if (!isIsoDate(value.createdAt)) return null
  return { id: value.id, name: value.name.trim(), createdAt: value.createdAt }
}

function readEntry(value: unknown): Entry | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || value.id.length === 0) return null
  if (value.type !== 'credit' && value.type !== 'debit') return null
  if (typeof value.amount !== 'string' || !parseAmount(value.amount)) return null
  if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)) return null
  if (typeof value.narration !== 'string') return null
  if (value.categoryId !== null && typeof value.categoryId !== 'string') return null
  if (!isIsoDate(value.occurredAt) || !isIsoDate(value.createdAt)) return null
  const amount = parseAmount(value.amount)
  if (!amount) return null
  return {
    id: value.id,
    type: value.type as TransactionType,
    amount: amount.toString(),
    currency: value.currency,
    narration: value.narration.trim(),
    categoryId: value.categoryId,
    occurredAt: new Date(value.occurredAt).toISOString(),
    createdAt: new Date(value.createdAt).toISOString(),
  }
}

function uniqueIds(ids: string[]): boolean {
  return new Set(ids).size === ids.length
}

export function parseBackup(value: unknown): { data: BackupFile } | { error: string } {
  if (!isRecord(value) || !Array.isArray(value.categories) || !Array.isArray(value.entries)) {
    return { error: 'This file is not a Spend Tracker backup.' }
  }

  const categories: Category[] = []
  for (const item of value.categories) {
    const category = readCategory(item)
    if (!category) return { error: 'This file is not a Spend Tracker backup.' }
    categories.push(category)
  }

  const entries: Entry[] = []
  for (const item of value.entries) {
    const entry = readEntry(item)
    if (!entry) return { error: 'This file is not a Spend Tracker backup.' }
    entries.push(entry)
  }

  if (!uniqueIds(categories.map((category) => category.id)) || !uniqueIds(entries.map((entry) => entry.id))) {
    return { error: 'This file is not a Spend Tracker backup.' }
  }

  return { data: { categories, entries } }
}

export async function downloadBackup(): Promise<void> {
  const payload: BackupFile = {
    categories: await readCategories(),
    entries: await readEntries(),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'spend-tracker.json'
  link.click()
  URL.revokeObjectURL(url)
}

export async function replaceAll(data: BackupFile): Promise<void> {
  await replaceLedger(data.categories, data.entries)
}
