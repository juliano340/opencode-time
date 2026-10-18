import { Plugin } from "@opencode/plugin"
import { STAMP_PREFIX_RE, stampPrefix } from "./format"

type Mention = { start: number; end: number; text: string }
type Attachment = { mention?: Mention }

/**
 * Desloca os offsets de menção de anexos (arquivos, agentes) após reescrever
 * o texto com um prefixo. Exigência da API: "update or remove attachment
 * mention offsets that no longer match".
 */
function shiftMentions(list: unknown, delta: number) {
  if (!Array.isArray(list)) return
  for (const item of list) {
    const mention = (item as Attachment)?.mention
    if (mention && Number.isInteger(mention.start) && Number.isInteger(mention.end)) {
      mention.start += delta
      mention.end += delta
    }
  }
}

export default Plugin.define({
  id: "opencode.time",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as { stamp?: boolean }
    if (options.stamp === false) return

    await ctx.session.hook("prompt", (event) => {
      const prompt = event.prompt as { text?: string; files?: unknown[]; agents?: unknown[] }
      const text = prompt?.text
      if (typeof text !== "string" || text.trim() === "") return
      // Já carimbada (retry / re-admissão): não duplicar.
      if (STAMP_PREFIX_RE.test(text)) return

      const prefix = stampPrefix()
      prompt.text = prefix + text
      shiftMentions(prompt.files, prefix.length)
      shiftMentions(prompt.agents, prefix.length)
    })
  },
})
