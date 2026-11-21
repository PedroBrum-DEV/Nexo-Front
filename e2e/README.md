# Testes ponta a ponta (manuais, contra o back-end Java)

Pré-requisitos: `npm i -D playwright axe-core`, back-end em `localhost:3077` com `WA_SIM_OPEN_SECONDS=2`,
build web `EXPO_PUBLIC_API_URL=http://localhost:3077 npx expo export --platform web --output-dir /tmp/mobile-live`
servido como SPA em `localhost:8099`.

- `criar-agente.cjs`: entra com a conta de teste (CPF 52998224725 / senha1234, criada antes pelo cadastro), cria o agente pelo assistente, conecta o WhatsApp simulado e inicia.
- `acessibilidade.cjs`: axe-core (WCAG 2.1 A/AA) em login, home, criar agente, agentes, registros, relatórios e conta, em tema claro e escuro. Resultado atual: 0 violações em 14 telas/temas.

Não rodam no CI (dependem de servidores e navegador).
