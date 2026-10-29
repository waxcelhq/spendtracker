import Dexie, { type EntityTable } from 'dexie'

export type SealedRecord = {
  id: string
  ciphertext: string
}

export type VaultRecord = {
  id: 'primary'
  question: string
  iterations: number
  passwordSalt: string
  passwordWrappedKey: string
  answerSalt: string
  answerWrappedKey: string
}

export class SpendDatabase extends Dexie {
  categories!: EntityTable<SealedRecord, 'id'>
  entries!: EntityTable<SealedRecord, 'id'>
  vault!: EntityTable<VaultRecord, 'id'>

  constructor() {
    super('spend-tracker')
    this.version(1).stores({
      categories: 'id, name, createdAt',
      entries: 'id, type, currency, categoryId, occurredAt, createdAt',
    })
    this.version(2).stores({
      categories: 'id',
      entries: 'id',
      vault: 'id',
    })
  }
}

export const db = new SpendDatabase()

export const VAULT_ID = 'primary' as const
