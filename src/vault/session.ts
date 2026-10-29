let dek: CryptoKey | null = null
let pendingDek: CryptoKey | null = null
let suspendCount = 0

export function getDek(): CryptoKey | null {
  return dek
}

export function setDek(next: CryptoKey | null) {
  dek = next
}

export function getPendingDek(): CryptoKey | null {
  return pendingDek
}

export function setPendingDek(next: CryptoKey | null) {
  pendingDek = next
}

export function clearSecrets() {
  dek = null
  pendingDek = null
}

export function suspendAutoLock() {
  suspendCount += 1
}

export function resumeAutoLock() {
  suspendCount = 0
}

export function isAutoLockSuspended(): boolean {
  return suspendCount > 0
}
