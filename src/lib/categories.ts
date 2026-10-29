import type { Category } from '../db/types'
import { db } from '../db/db'
import { readCategories, readEntries, writeCategory } from '../vault/store'

function normalized(name: string): string {
  return name.trim().toLowerCase()
}

export async function createCategory(name: string): Promise<{ category: Category } | { error: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Enter a category name.' }
  const existing = await readCategories()
  if (existing.some((category) => normalized(category.name) === normalized(trimmed))) {
    return { error: 'That category already exists.' }
  }
  const category: Category = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: new Date().toISOString(),
  }
  await writeCategory(category)
  return { category }
}

export async function renameCategory(id: string, name: string): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return 'Enter a category name.'
  const existing = await readCategories()
  if (existing.some((category) => category.id !== id && normalized(category.name) === normalized(trimmed))) {
    return 'That category already exists.'
  }
  const current = existing.find((category) => category.id === id)
  if (!current) return 'Enter a category name.'
  await writeCategory({ ...current, name: trimmed })
  return null
}

export async function deleteCategory(id: string): Promise<string | null> {
  const entries = await readEntries()
  if (entries.some((entry) => entry.categoryId === id)) return 'This category is used by transactions.'
  await db.categories.delete(id)
  return null
}
