/** Formata um timestamp como `17/10/2026 14:32` (horário local, 24h). */
export function formatStamp(ts?: number): string {
  const d = ts ? new Date(ts) : new Date()
  const p2 = (n: number) => String(n).padStart(2, "0")
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

/** Prefixo de carimbo injetado nas mensagens do usuário. */
export function stampPrefix(ts?: number): string {
  return `[${formatStamp(ts)}] `
}

/** Regex que detecta um carimbo no início do texto (evita duplicar em re-admissões). */
export const STAMP_PREFIX_RE = /^\[\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}\]\s/
