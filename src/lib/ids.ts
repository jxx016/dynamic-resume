export function newId(prefix: string, seq: number): string { return `${prefix}_${seq}` }
export function nowIso(clock: () => Date): string { return clock().toISOString() }
