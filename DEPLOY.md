# nexo-front · o que falta para o deploy

Legenda: ✅ pronto · ⬜ falta · ⚠️ compila, mas nunca foi visto rodando. A API fica no repositório `nexo-back`.

> Subir para testes agora: `DEPLOY-VERCEL.md`.

## Estado
✅ App Expo (iOS, Android e web): conta, agentes, conversas, registros, **Agenda**, **Avisos** (sino com não lidos), relatórios, privacidade, sessões; claro/escuro. `tsc`, 27 testes e o build web passam. Trava no build da Vercel contra publicar em modo demonstração. ⚠️ As telas Agenda, Avisos e a seção "Reuniões por vídeo" do agente nunca foram vistas num navegador ou aparelho.

## 1. Bloqueantes (web, para os testes)
- ⬜ **`EXPO_PUBLIC_API_URL` na Vercel** (https, sem barra). O build falha se faltar.
- ⬜ **Ver as telas novas** no navegador e no celular; conferir se o rótulo "Relatórios" cabe com 6 abas (a fonte foi reduzida para 11 px).
- ⬜ **Aceite de termos no cadastro** + política de privacidade e termos em endereço público (as lojas exigem). Os termos devem dizer que o WhatsApp é não oficial e que o atendimento é automatizado.
- ⬜ **Campo "função" ao criar o agente** (a API já aceita `role`; falta o input). A IA usa nome e função ao dizer, se perguntarem com sinceridade, que é assistente virtual.
- ⬜ Conferir contra a API real quais telas ainda mostram dados de exemplo (o README cita Conversas, Estatísticas e Relatórios); esconder a que mostrar número inventado.

## 2. Para as lojas (depois)
- ⬜ Contas Apple Developer e Google Play; identificador definitivo (hoje `br.com.nexo.painel` é provisório e **não muda depois de publicado**); `version`, `buildNumber`, `versionCode`.
- ⬜ `eas.json` (development/preview/production), EAS Build e assinatura; testar em iPhone e Android reais (cofre de senhas, PDF/compartilhar, seletor de fotos, notch).
- ⬜ Capturas e textos, classificação indicativa, formulários de privacidade (Apple "App Privacy", Google "Data safety"), conta de teste para a revisão, página web de exclusão de conta.
- ⬜ `expo-updates` e Sentry (não instalados). **Push:** o servidor envia, mas o app não registra o aparelho (falta `expo-notifications` e chamar `/api/me/push-token`).
- ⬜ Revisão com leitor de tela (VoiceOver/TalkBack). Só pt-BR.

## 3. Pequenos
- ⬜ Cancelar reunião pela tela Agenda (hoje só pela conversa); a Agenda mostra horários no fuso do aparelho.
- ⬜ Rodar os e2e (`e2e/`) no CI.
