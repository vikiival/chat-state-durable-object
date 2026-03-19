export function deserializeValue<T>(valueJson: string): T {
  return JSON.parse(valueJson) as T
}

export function serializeValue(value: unknown): string {
  return JSON.stringify(value)
}
