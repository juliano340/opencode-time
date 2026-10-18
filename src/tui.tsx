import { For, Show, createMemo, createSignal, onCleanup } from "solid-js"
import type { PanelInput } from "@opencode/plugin/tui/context"
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { formatStamp } from "./format"

type ListItem = {
  type?: string
  time?: { created?: number }
  text?: string
  parts?: Array<{ type?: string; text?: string }>
}

type ServerEvent = { type?: string; details?: { type?: string } }

/** Tipos de evento relevantes para atualizar os stamps (ignora deltas de streaming). */
function isRelevantEvent(event: ServerEvent): boolean {
  const type = event?.type ?? event?.details?.type ?? ""
  if (!type) return false
  return (
    type === "message.created" ||
    type === "message.updated" ||
    type === "message.removed" ||
    type.startsWith("session.execution") ||
    type.startsWith("session.compaction")
  )
}

/** Extrai o texto da mensagem (text direto ou parts), com defesa de shape. */
function messageText(message: ListItem): string {
  if (typeof message.text === "string" && message.text.trim() !== "") return message.text
  const parts = message.parts
  if (Array.isArray(parts)) {
    return parts
      .filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("\n")
  }
  return ""
}

function summarize(text: string, max = 200): string {
  const flat = text.replace(/\s+/g, " ").trim()
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat
}

export default Plugin.define({
  id: "opencode.time.tui",
  setup(context) {
    // ── Slot acima do composer: hora da última mensagem sua e da última resposta do agente ──
    context.ui.slot({
      append: "session.composer.top",
      render: (slot: { sessionID?: string }) => (
        <LastExchange sessionID={slot?.sessionID} />
      ),
    })

    // ── Painel /timeline: histórico completo da sessão com data/hora de cada mensagem ──
    context.ui.slot({
      append: "session.panel",
      render: (panel: PanelInput) => (
        <Show when={(panel as { name?: string }).name === "time.historico"}>
          <TimelinePanel panel={panel} />
        </Show>
      ),
    })

    // ── Comando /timeline (slash) + entrada no command palette ──
    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "time.historico",
          title: "Abrir histórico com data/hora das trocas",
          group: "Time",
          palette: true,
          slash: { name: "historico" },
          enabled: () => true,
          run: () => {
            context.ui.panel.open("time.historico")
          },
        },
      ],
    }))
  },
})

/** Stamp de "você" e "agente" no topo do composer, atualizado em tempo real. */
function LastExchange(props: { sessionID?: string }) {
  const context = usePlugin()
  const [tick, setTick] = createSignal(0)
  const stop = context.data.listen((event: ServerEvent) => {
    if (isRelevantEvent(event)) setTick((t) => t + 1)
  })
  onCleanup(stop)

  const findLastStamp = (type: string) => {
    tick()
    if (!props.sessionID) return undefined
    const list = (context.data.session.message.list(props.sessionID) ?? []) as ListItem[]
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i] as ListItem
      if (m?.type === type && m.time?.created) return formatStamp(m.time.created)
    }
    return undefined
  }

  const stampUser = createMemo(() => findLastStamp("user"))
  const stampAgent = createMemo(() => findLastStamp("assistant"))

  const muted = () => (context.theme as any)?.text?.muted ?? (context.theme as any)?.text?.base

  return (
    <Show when={props.sessionID && (stampUser() || stampAgent())}>
      <text fg={muted()}>você {stampUser() ?? "—"} · agente {stampAgent() ?? "—"}</text>
    </Show>
  )
}

/** Painel com o histórico datado da sessão (usuário e agente). */
function TimelinePanel(props: { panel: PanelInput }) {
  const context = usePlugin()
  const p = props.panel

  // Esc fecha o painel (camada de input ativa enquanto o painel possui o foco).
  context.keymap.layer(() => ({
    commands: [
      {
        id: "time.timeline.close",
        bind: "escape",
        run: () => p.close(),
      },
    ],
  }))

  const sessionID = () => (p as { sessionID?: string }).sessionID ?? ""

  const data = createMemo(() => {
    const list = (context.data.session.message.list(sessionID()) ?? []) as ListItem[]

    // Diagnóstico temporário: quantos itens e de cada tipo a lista entrega.
    const byType: Record<string, number> = {}
    for (const m of list) {
      const t = m?.type ?? "(sem type)"
      byType[t] = (byType[t] ?? 0) + 1
    }
    const counts = Object.entries(byType)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([t, n]) => `${t}:${n}`)
      .join(" · ")

    const out: Array<{ stamp: string; role: string; summary: string; ts: number }> = []
    for (const m of list) {
      if (m?.type !== "user" && m?.type !== "assistant") continue
      const ts = m.time?.created ?? 0
      out.push({
        ts,
        stamp: ts ? formatStamp(ts) : "--/--/---- --:--",
        role: m.type === "user" ? "você" : "agente",
        summary: summarize(messageText(m)) || "(sem texto)",
      })
    }
    // Ordem de conversa: mais antigo no topo, mais novo embaixo.
    out.sort((a, b) => a.ts - b.ts)
    return { rows: out, counts }
  })

  const muted = () => (context.theme as any)?.text?.muted ?? undefined
  const base = () => (context.theme as any)?.text?.base ?? undefined

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text fg={base()}>Timeline (Esc fecha)</text>
      <For each={sessionID() ? data().rows : []}>
        {(row) => (
          <text>
            <span fg={muted()}>{`${row.stamp} ${row.role}: `}</span>
            <span>{row.summary}</span>
          </text>
        )}
      </For>
      <Show when={sessionID() && data().counts}>
        <text fg={muted()}>[debug lista] {data().counts}</text>
      </Show>
      <Show when={sessionID() && data().rows.length === 0}>
        <text fg={muted()}>Nenhuma mensagem ainda.</text>
      </Show>
      <Show when={!sessionID()}>
        <text fg={muted()}>Abra dentro de uma sessão.</text>
      </Show>
    </box>
  )
}
