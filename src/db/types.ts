export type TransactionType = 'credit' | 'debit'

export type Category = {
  id: string
  name: string
  createdAt: string
}

export type Entry = {
  id: string
  type: TransactionType
  amount: string
  currency: string
  narration: string
  categoryId: string | null
  occurredAt: string
  createdAt: string
}

export type BackupFile = {
  categories: Category[]
  entries: Entry[]
}
