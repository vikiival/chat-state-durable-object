export function deserializeValue<T>(valueJson: string): T {
  try {
    return JSON.parse(valueJson) as T
  } catch {
    return valueJson as T
  }
}

export function serializeValue(value: unknown): string {
  return JSON.stringify(value)
}
