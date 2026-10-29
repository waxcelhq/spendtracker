import { db, VAULT_ID, type SealedRecord, type VaultRecord } from '../db/db'
import type { Category, Entry } from '../db/types'
import { decryptJson, encryptJson, generateDek, KDF_ITERATIONS, normalizeAnswer, unwrapDek, wrapDek } from './crypto'
import { getDek, getPendingDek, setDek, setPendingDek } from './session'

function requireDek(): CryptoKey {
  const dek = getDek()
  if (!dek) throw new Error('Locked.')
  return dek
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlainCategory(value: unknown): value is Category {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && typeof value.name === 'string' && typeof value.createdAt === 'string' && typeof value.ciphertext !== 'string'
}

function isPlainEntry(value: unknown): value is Entry {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && typeof value.amount === 'string' && typeof value.type === 'string' && typeof value.ciphertext !== 'string'
}

function isSealed(value: unknown): value is SealedRecord {
  return isRecord(value) && typeof value.id === 'string' && typeof value.ciphertext === 'string'
}

async function sealRows<T extends { id: string }>(table: typeof db.categories, rows: T[], dek: CryptoKey) {
  if (rows.length === 0) return
  const sealed = await Promise.all(rows.map(async (row) => ({ id: row.id, ciphertext: await encryptJson(dek, row) })))
  await table.bulkPut(sealed)
}

export async function sealPlaintext(dek: CryptoKey) {
  const categories = (await db.categories.toArray()) as unknown[]
  const entries = (await db.entries.toArray()) as unknown[]
  await db.transaction('rw', db.categories, db.entries, async () => {
    await sealRows(db.categories, categories.filter(isPlainCategory), dek)
    await sealRows(db.entries, entries.filter(isPlainEntry), dek)
  })
}

async function readTable<T extends { id: string }>(table: typeof db.categories, dek: CryptoKey): Promise<T[]> {
  const rows = (await table.toArray()) as unknown[]
  const records: T[] = []
  for (const row of rows) {
    if (!isSealed(row)) continue
    records.push(await decryptJson<T>(dek, row.ciphertext))
  }
  return records
}

export async function readCategories(): Promise<Category[]> {
  const dek = getDek()
  if (!dek) return []
  const categories = await readTable<Category>(db.categories, dek)
  return categories.sort((a, b) => a.name.localeCompare(b.name))
}

export async function readEntries(): Promise<Entry[]> {
  const dek = getDek()
  if (!dek) return []
  return readTable<Entry>(db.entries, dek)
}

export async function readEntry(id: string): Promise<Entry | null> {
  const dek = getDek()
  if (!dek) return null
  const row = (await db.entries.get(id)) as unknown
  if (!isSealed(row)) return null
  return decryptJson<Entry>(dek, row.ciphertext)
}

export async function writeCategory(category: Category) {
  const dek = requireDek()
  await db.categories.put({ id: category.id, ciphertext: await encryptJson(dek, category) })
}

export async function writeEntry(entry: Entry) {
  const dek = requireDek()
  await db.entries.put({ id: entry.id, ciphertext: await encryptJson(dek, entry) })
}

export async function replaceLedger(categories: Category[], entries: Entry[]) {
  const dek = requireDek()
  const sealedCategories = await Promise.all(
    categories.map(async (category) => ({ id: category.id, ciphertext: await encryptJson(dek, category) })),
  )
  const sealedEntries = await Promise.all(entries.map(async (entry) => ({ id: entry.id, ciphertext: await encryptJson(dek, entry) })))
  await db.transaction('rw', db.categories, db.entries, async () => {
    await db.categories.clear()
    await db.entries.clear()
    if (sealedCategories.length > 0) await db.categories.bulkPut(sealedCategories)
    if (sealedEntries.length > 0) await db.entries.bulkPut(sealedEntries)
  })
}

export async function loadVault(): Promise<VaultRecord | undefined> {
  return db.vault.get(VAULT_ID)
}

export async function createVault(password: string, question: string, answer: string) {
  const categories = ((await db.categories.toArray()) as unknown[]).filter(isPlainCategory)
  const entries = ((await db.entries.toArray()) as unknown[]).filter(isPlainEntry)
  const dek = await generateDek()
  const passwordWrap = await wrapDek(dek, password)
  const answerWrap = await wrapDek(dek, normalizeAnswer(answer))
  const vault: VaultRecord = {
    id: VAULT_ID,
    question: question.trim(),
    iterations: KDF_ITERATIONS,
    passwordSalt: passwordWrap.salt,
    passwordWrappedKey: passwordWrap.wrapped,
    answerSalt: answerWrap.salt,
    answerWrappedKey: answerWrap.wrapped,
  }
  await db.transaction('rw', db.vault, db.categories, db.entries, async () => {
    await db.vault.put(vault)
    await sealRows(db.categories, categories, dek)
    await sealRows(db.entries, entries, dek)
  })
  setDek(dek)
}

export async function unlockWithPassword(password: string) {
  const vault = await loadVault()
  if (!vault) throw new Error('Set a password first.')
  let dek: CryptoKey
  try {
    dek = await unwrapDek(vault.passwordWrappedKey, vault.passwordSalt, password, vault.iterations)
  } catch {
    throw new Error('Wrong password.')
  }
  await sealPlaintext(dek)
  setDek(dek)
}

export async function verifyAnswer(answer: string) {
  const vault = await loadVault()
  if (!vault) throw new Error('Set a password first.')
  setPendingDek(null)
  try {
    const dek = await unwrapDek(vault.answerWrappedKey, vault.answerSalt, normalizeAnswer(answer), vault.iterations)
    setPendingDek(dek)
  } catch {
    throw new Error('Wrong answer.')
  }
}

export async function completeReset(password: string) {
  const dek = getPendingDek()
  const vault = await loadVault()
  if (!dek || !vault) throw new Error('Wrong answer.')
  const passwordWrap = await wrapDek(dek, password, vault.iterations)
  await db.vault.update(VAULT_ID, {
    passwordSalt: passwordWrap.salt,
    passwordWrappedKey: passwordWrap.wrapped,
  })
  setPendingDek(null)
  setDek(dek)
}

export async function changePassword(current: string, next: string) {
  const vault = await loadVault()
  const dek = requireDek()
  if (!vault) throw new Error('Set a password first.')
  try {
    await unwrapDek(vault.passwordWrappedKey, vault.passwordSalt, current, vault.iterations)
  } catch {
    throw new Error('Wrong password.')
  }
  const passwordWrap = await wrapDek(dek, next, vault.iterations)
  await db.vault.update(VAULT_ID, {
    passwordSalt: passwordWrap.salt,
    passwordWrappedKey: passwordWrap.wrapped,
  })
}
