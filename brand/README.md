# Marca

**Símbolo:** balão de conversa (atendimento) + onda (a identidade azul-mar) + ponto dourado (o agente, sempre ativo). Funciona sozinho a partir de 16 px; abaixo disso use só o balão.

| Arquivo | Uso |
|---|---|
| `logo-mark.svg` | Símbolo, fundo claro (cabeçalhos, documentos) |
| `logo-mark-white.svg` | Símbolo para fundo azul ou escuro |
| `logo-horizontal.svg` | Símbolo + nome (texto em Inter; converta o texto em curvas antes de enviar a gráfica) |
| `logo-mark-512.png` | PNG com fundo transparente |
| `icon-1024.png` | Ícone do app (iOS / loja), fundo azul sem transparência |
| `adaptive-foreground-1024.png` | Primeiro plano do ícone adaptativo do Android (fundo `#0B5C8E`) |
| `splash-1024.png`, `favicon-64.png` | Tela de abertura do app e favicon |

**Cores:** azul `#0B5C8E`, dourado `#E0B040`, tinta `#0A2A40`, branco. O dourado é só o ponto: não use em texto.
**Respiro:** deixe ao redor do símbolo pelo menos a largura da onda (metade da altura do balão). Não gire, não estique, não troque as cores.

## Nome
O nome da marca é **Nexo**. Se um dia mudar, troque em:
- Site: `app/src/brand.js` e o `<title>` em `app/index.html`
- App: `brand.name` em `src/lib/theme.ts`, e `name`, `slug`, `scheme`, `bundleIdentifier` e `package` em `app.json`
- Arquivo `logo-horizontal.svg`: o texto dentro dele
