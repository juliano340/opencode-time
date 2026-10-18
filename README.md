# opencode-time

Plugin do OpenCode que adiciona **data e hora a cada troca de mensagens do chat**:

| Recurso | O que faz |
|---|---|
| **Carimbo nas mensagens** (server plugin, hook `prompt`) | Prefixa `[17/10/2026 20:28] ` no texto de cada mensagem que você envia — o selo aparece no chat e persiste no histórico. O modelo também passa a ver quando cada mensagem foi enviada. |
| **Stamps em tempo real no composer** (TUI, slot `session.composer.top`) | Linha discreta acima da caixa de input: `você 17/10/2026 20:28 · agente 17/10/2026 20:30` — sempre visível, sem rolar a tela. |
| **Painel `/historico`** (TUI, slot `session.panel`) | Comando `/historico` abre um painel com o histórico completo da sessão, cada mensagem datada (usuário **e** agente), mais antigo no topo. `Esc` fecha. Observação: o OpenCode tem um `/timeline` **nativo** (só mostra suas mensagens); por isso o nosso comando se chama `/historico`. |

Formato: `dd/mm/aaaa hh:mm` (horário local, 24h).

## Arquivos do código

```
D:\sandbox\OpenCode_Plugins\time\   ← código-fonte (edite aqui)
├── src/index.ts    Plugin server: hook session.prompt → carimba [dd/mm/aaaa hh:mm]
├── src/format.ts   Formato dd/mm/aaaa hh:mm compartilhado
├── src/tui.tsx     Plugin TUI: slot "você/agente" no composer + painel /historico
├── package.json    exports: "." (server) e "./tui" (TUI)
├── node_modules/   fallback local de @opencode/plugin, @opentui/*, solid-js
└── tsconfig.json
```

## Instalação (como está agora, global)

Layout documentado de **descoberta global** — `~/.config/opencode/plugins/<nome>/` com os dois entrypoints:

```
C:\Users\julia\.config\opencode\plugins\time\
├── index.ts   ← import server de file:///D:/sandbox/OpenCode_Plugins/time/src/index.ts
└── tui.ts     ← import TUI de file:///D:/sandbox/OpenCode_Plugins/time/src/tui.tsx
```

- O servidor carrega `index.ts` (hook do carimbo) em todas as locations — verificado no log `loading plugin ... time/index.ts`.
- O TUI carrega `tui.ts` automaticamente (o servidor informa a lista de plugins com componente TUI ao cliente — `cli.json` não precisa de entrada).
- Não há entradas em `opencode.json` nem `cli.json`; só o diretório de descoberta.

Para desenvolvimento: edite `src/` no sandbox e reinicie o OpenCode (o watcher recarrega alterações nos arquivos de config; mudanças no código-fonte via `file://` podem exigir restart). Resultado server-side pode ser testado sem gastar tokens:

```sh
SID=$(opencode api post /api/session -d '{"title":"t"}' | grep -oE 'ses_[A-Za-z0-9]+')
opencode api post "/api/session/$SID/prompt" -d '{"text":"teste","resume":false}'
# o texto admitido deve começar com o carimbo
opencode api delete "/api/session/$SID"
```

## Desinstalação (sem vestígios)

```sh
rm -rf "C:\\Users\\julia\\.config\\opencode\\plugins\\time"
opencode service restart
```

Nada é escrito dentro do OpenCode: sem estado persistido (`ctx.storage` nunca usado), sem modificações em outros arquivos de config. Apenas as mensagens enviadas *enquanto o carimbo estava ativo* mantêm o prefixo `[dd/mm/aaaa hh:mm]` no seu próprio histórico.

## Opções

No `opencode.json` (via array `plugins` com forma de objeto, ex. `{"package": "...", "options": {"stamp": false}}`):

- `stamp` (default `true`) — desliga o carimbo nas mensagens; slot e painel continuam.

## Observações técnicas

- O carimbo desloca os offsets de `mention` dos anexos (arquivos/agentes) ao reescrever o texto — exigência da API de hooks.
- Re-admissões de prompt com o mesmo ID não duplicam o carimbo (guarda por regex de prefixo `[dd/mm/aaaa hh:mm]`).
- A API TUI do OpenCode não expõe slot por mensagem no transcript; a hora da resposta do agente aparece no slot acima do composer e no painel `/historico` (que lê `time.created` nativo das mensagens).
- Node modules locais servem de fallback de resolução; o runtime do OpenCode também injeta `@opencode/plugin` quando o pacote não existe localmente.
