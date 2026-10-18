<div align="center">

# ⏱ opencode-time

**Data e hora em cada troca de mensagens do [OpenCode](https://opencode.ai) — sem rolar a tela.**

[17/10/2026 14:32] na sua mensaguem · últimas trocas sempre visíveis acima do composer · painel `/historico` completo

</div>

---

## Como fica no seu chat

**1. Cada mensagem que você envia recebe um selo** (o agente também passa a ver quando cada coisa foi dita):

```text
[17/10/2026 14:32] por que o build quebrou?
```

**2. Uma linha discreta acima da caixa de input**, sempre atualizada em tempo real:

```text
você 17/10/2026 14:32 · agente 17/10/2026 14:38
```

**3. Painel `/historico`** com toda a conversa datada (usuário **e** agente), mais antigo no topo — `Esc` fecha:

```text
17/10/2026 14:32 você: por que o build quebrou?
17/10/2026 14:36 agente: era o lockfile desatualizado...
```

> ℹ️ O OpenCode v2 tem um painel `/timeline` **nativo** que só lista suas próprias mensagens. Por isso o comando deste plugin se chama `/historico` — o nosso inclui as respostas do agente.

Formato: `dd/mm/aaaa hh:mm` (horário local, 24h).

## Instalação

Refere-se ao OpenCode **v2.0.32+**.

### Entradas globais (descoberta)

Crie os dois entrypoints apontando para o clone deste repositório:

```
~/.config/opencode/plugins/time/
├── index.ts   ← entrypoint server
└── tui.ts     ← entrypoint TUI
```

O OpenCode carrega os dois automaticamente (o TUI recebe a lista de plugins com componente do servidor conectado — não é preciso editar o `cli.json`).

Reinicie o OpenCode para aplicar.

**`~/.config/opencode/plugins/time/index.ts`**

```ts
import plugin from "<caminho-deste-repo>/src/index.ts"
export default plugin
```

**`~/.config/opencode/plugins/time/tui.ts`**

```ts
import plugin from "<caminho-deste-repo>/src/tui.tsx"
export default plugin
```

Clonando este repositório, os caminhos ficam, por exemplo:

```ts
// index.ts
import plugin from "file:///D:/dev/opencode-time/src/index.ts"
export default plugin
```

Reinstale as dependências do clone (`bun install`) — elas servem de fallback de resolução; as instâncias de Solid/OpenTUI do host sempre prevalecem na UI.

### Por projeto

O mesmo layout funciona em `<projeto>/.opencode/plugins/time/{index.ts, tui.ts}`.

### Via `opencode.json` (pesquisado)

```jsonc
{
  "plugins": ["<caminho-para-clone-deste-repo>"]
}
```

## Desinstalação (sem vestígios)

Apague o diretório de descoberta e reinicie:

```sh
rm -rf ~/.config/opencode/plugins/time   # ou o .opencode equivalente do projeto
opencode service restart
```

O plugin é 100% stateless: nada é gravado no OpenCode além do prefixo `[dd/mm/aaaa hh:mm]` no corpo das mensagens que você enviou enquanto ele estava ativo.

## Como funciona

| Etapa | Mecanismo |
|---|---|
| Carimbo | Hook `session.prompt` reescreve o texto canônico da mensagem (e desloca os offsets de `mention` dos anexos — arquivos/agentes) |
| Seletor anti-duplicação | Regex `^\[\d{1,2}/\d{1,2}/\d{4} \d{1,2}:\d{2}\]\s` — re-admissões de prompt não recebem selo duas vezes |
| Slot no composer | TUI plugin em `session.composer.top` lê `data.session.message.list()` e reage a eventos do servidor (`message.created`, `session.execution.*`), ignorando deltas de streaming |
| Painel | Slot `session.panel` + comando slash via `context.keymap.layer`, listando `time.created` nativo de cada mensagem |

## Opções

```jsonc
{
  "plugins": [
    {
      "package": "opencode-time",
      "options": { "stamp": false }   // desliga o carimbo nas mensagens; slot e painel continuam
    }
  ]
}
```

## Estrutura

```text
src/
├── index.ts   Plugin server: hook session.prompt → carimbo [dd/mm/aaaa hh:mm]
├── format.ts  Formatação dd/mm/aaaa hh:mm compartilhada (server e TUI)
└── tui.tsx    Plugin TUI: slot "você/agente" no composer + painel /historico
```

## Desenvolvido com

Este plugin foi criado como exemplo dos dois lados da API de plugins do OpenCode: **server** (hooks de sessão) e **TUI** (slots, painéis, comandos slash via `@opencode/plugin/tui`).

## Licença

MIT
