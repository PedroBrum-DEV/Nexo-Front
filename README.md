# Nexo — app (Expo / React Native)

Versão nativa do painel (iOS e Android), com versão web (mesmo código, `npm run export:web`). Este é o repositório `nexo-front`; a API fica no `nexo-back`. Mesmas telas e regras: criar conta e login (CPF ou CNPJ, 18+, senha com olho), Resumo, Registros, Agentes, conversa, configurações, conectar WhatsApp.

## Rodar no celular (Expo Go)

```bash
cd mobile
npm install
npx expo start        # leia o QR code com o Expo Go (iOS: câmera; Android: app Expo Go)
```

Sem configurar nada, roda em **demonstração** (dados fictícios; contas guardadas só no aparelho). Para ligar à API da IA:

```bash
EXPO_PUBLIC_API_URL=https://sua-api npx expo start
```

O celular precisa alcançar essa URL (use o endereço da rede, não `localhost`). O contrato de `/api/auth/*` e de todas as rotas está no `nexo-back` (`GET /openapi.json` ou `src/main/resources/openapi.json`).

Outros comandos: `npm run typecheck`, `npm run export:web` (versão web para testar no navegador).

## Estrutura

```
src/app/                 rotas (Expo Router)
  (auth)/login, cadastro
  (app)/(tabs)/          Home (Resumo), Registros, Agentes, Conta, Radar
  (app)/agente/novo      criar agente (3 etapas)
  (app)/agente/[id]      conversas e configurações   .../conversa/[cid]
  (app)/detalhes         serviços, horários, 8 semanas
src/components/          ui.tsx (botão, campos, senha com olho, toast…), charts, Connect (QR)
src/lib/                 theme (tokens), validators (CPF/CNPJ/idade/senha), auth, store, api, data
```

## Funções de gestão

- **Primeiros passos:** cartão na Home com 4 etapas (criar agente, conectar o WhatsApp, testar, ativar); o progresso vem do estado real. Uma conta nova começa vazia; na demonstração há o botão "Carregar dados de exemplo".
- **Modelos por segmento** (`src/lib/templates.ts`): clínica, salão, imobiliária, advocacia, academia e restaurante, com instruções e horários prontos. Os valores são exemplos: o app exige marcar "Revisei" antes de seguir.
- **Histórico de versões:** cada vez que as instruções são salvas vira uma versão; dá para ver o que mudou (linha a linha) e restaurar, com "Desfazer".
- **Relatórios:** aba com período (semana, 4 ou 8 semanas) e agente; exporta **CSV** (Excel em português, com BOM e separador `;`) e **PDF** (no celular gera o arquivo e abre o compartilhamento; no navegador abre a impressão só do relatório).
- **Busca global:** `Ctrl+K` (⌘K no Mac) ou o ícone de lupa no celular. Atalhos no computador: `g` depois `h/r/a/l/c` (ir para), `n` (novo agente), `t` (tema), `/` (buscar); nunca disparam enquanto você digita num campo.
- **Privacidade e dados** (Conta): baixar meus dados (JSON, sem senhas) e excluir a conta (pede senha e a palavra EXCLUIR).
- **Sessões ativas** (Conta): aparelhos conectados, encerrar um, sair dos outros ou de todos. Com a API, quem registra e derruba é o servidor (o token do aparelho encerrado para de valer na hora).
- O espaço de trabalho de cada conta (agentes, registros, histórico, progresso) fica guardado no aparelho (`src/lib/store.tsx`). Com a API, os agentes vêm do servidor.

## Radar de empresas

Tela **Radar** (`src/app/(app)/(tabs)/radar.tsx`, só com a API ligada): informe a **localização**, marque o **tipo de problema** que os seus serviços resolvem (não tem site, agenda só pelo WhatsApp, site desatualizado) e toque em **Pesquisar**. O servidor (`nexo-back`, rotas `/api/radar*`) procura as empresas, descobre a necessidade real de cada uma e a tela mostra:

- cada empresa com a **necessidade**, o que oferecer, os contatos achados, a nota e o motivo (em **Detalhes**: sinais do site, logotipo, fotos e a primeira mensagem);
- **Automático:** busca sozinha a cada 4 horas (até 10 empresas por busca) e faz o primeiro contato sozinho, em dia útil, das 9h às 18h, com intervalo entre envios. Configure a oferta e o que a IA pode afirmar (prazo, suporte);
- **Negociações:** quem está em atendimento, quem espera a vez e quem foi pausado (10 minutos sem responder); a IA retoma as pausadas depois, com o contexto;
- **Esboço personalizado:** gera uma prévia da página de agendamento ou do site da empresa (link `/demo/...` no servidor) para você abrir ou copiar;
- ações por empresa: contatar agora (WhatsApp ou e-mail), gerar esboço e descartar.

A tela atualiza a cada 5 s enquanto está aberta. Aviso fixo: o WhatsApp do servidor é uma integração **não oficial**, que o WhatsApp pode restringir; para evitar, use "Só e-mail" no primeiro contato. No celular o Radar não entra na barra inferior (já tem 6 abas): abre pelo cartão da Home, pelo menu lateral (computador) ou pela busca (`Ctrl+K`, atalho `g` e depois `e`). Sem `EXPO_PUBLIC_API_URL` a tela só explica o que faz. A lógica pura (filtros, "responde em…", validação) está em `src/lib/radar.ts`, com testes em `src/lib/__tests__/radar.test.ts`.

## Recuperar senha, tema escuro e confirmação da foto

- **Esqueceu a senha?** (link no login): documento → código de 6 números por e-mail → nova senha. Na demonstração não há e-mail real: o código aparece na própria tela, com aviso. Com `EXPO_PUBLIC_API_URL`, usa `/api/auth/forgot`, `/forgot/verify` e `/reset` (implementado no `nexo-back`). O cadastro agora pede o **e-mail**.
- **Modo escuro:** `Sistema` (padrão), `Claro` ou `Escuro` no cartão **Aparência** da Conta; também há um botão lua/sol no menu lateral, na barra do celular e no login. As cores vivem em `src/lib/theme.ts` (duas paletas); a escolha fica guardada no aparelho.
- **Foto e avatar:** ao escolher, aparece uma **prévia** com **Confirmar** e **Cancelar**; só depois de confirmar a foto vale (topo e menu).

## Conta, foto e senha

Aba **Conta**: foto de perfil (enviar da galeria, recortada em quadrado e reduzida a 320 px) ou um dos **12 avatares coloridos** (`src/lib/avatars.json`, desenhos originais em SVG); dados da conta com **CPF/CNPJ oculto e um olho para mostrar**; e **Trocar senha** (senha atual, nova e confirmação, com as mesmas regras do cadastro). A foto aparece no topo do celular e no menu lateral do computador. Na demonstração a troca de senha é conferida no aparelho; com API, usa `PUT /api/auth/password` (contrato no `openapi.json` do `nexo-back`). Dependências: `expo-image-picker`, `expo-image-manipulator`, `@react-native-async-storage/async-storage`.

## Celular e computador: mesma estrutura

Os dois usam o mesmo conteúdo e a mesma linguagem visual (fundo cinza-azulado, cartões brancos, azul-marinho como cor de marca); muda só a organização. **Celular:** barra azul-marinho no topo (marca e avatar nas abas; voltar e título nas telas internas), um cartão por assunto, indicadores em 2 × 2, os três detalhes (serviços, horários, 8 semanas) num só cartão com abas, um cartão por registro e login com faixa de marca em cima de uma folha branca arredondada.

## Telas grandes (computador e tablet)

Acima de 900 px o app muda de organização (`src/lib/layout.ts`, `WIDE`):

- **Menu lateral azul-marinho** (`Sidebar.tsx`) com o logo, a navegação e a conta; o destaque desliza até o item ativo.
- **Fundo cinza-azulado com cartões brancos** (`Card` em `ui.tsx`), em vez de página toda branca.
- **Home:** faixa com 4 indicadores, gráfico grande da semana, "Para decidir" ao lado e três cartões (serviços, horários, últimas 8 semanas) já visíveis.
- **Registros:** tabela com tipo, assunto, quando e ações na mesma linha.
- **Agentes:** grade de cartões com Abrir, Pausar/Iniciar e "Criar novo agente". **Agente:** configurações em duas colunas (WhatsApp e instruções | teste e remoção).
- **Login e cadastro:** tela dividida, com o painel de marca à esquerda (`AuthFrame.tsx`).

Abaixo de 900 px nada disso aparece: barra de abas embaixo e uma coluna.

## Marca e movimento

O logo está em `brand/` (SVG e PNG; ícone, ícone adaptativo e abertura já ligados em `app.json`). O símbolo é desenhado em `src/components/Logo.tsx` e, nas telas de entrada, anima: o balão aparece, a onda é desenhada e o ponto surge (~1,2 s).

Movimento (Reanimated), respeitando "reduzir movimento": entrada em cascata (`Reveal`, 700 ms, 90 ms entre itens, sobe 28 px com leve zoom), que toca de novo a cada visita a uma aba; números que contam até o valor em 1,2 s; barras que crescem da base em 0,9 s; destaque do menu lateral deslizando; cartões que sobem ao passar o mouse; ondas do painel de login em deriva lenta; check de WhatsApp com zoom. O olho da senha (`EyeIcon`) fecha e abre de verdade: a pálpebra se move e a pupila aparece (fechado e cinza = senha escondida; aberto e azul = senha à mostra). O olho também mostra e esconde o CPF na tela Conta. Se o Windows estiver com as animações desligadas (Configurações > Acessibilidade > Efeitos visuais), o app respeita e encurta ou desliga os movimentos.

## Decisões de design

Seguem as referências pedidas: **Impeccable** (modo "Operate": uma família de fonte, cor contida, sem "número gigante + legenda", sem mini-gráficos decorativos, estados vazios que ensinam), **Emil Kowalski** (`animate-expo`, `mobile-native`: Expo Router, toque com escala 0,97 em 100 ms, abas sem animação, háptico só em seleção/erro/sucesso, respeita "reduzir movimento", alvos de 44–48 pt), **Web Interface Guidelines** (rótulos de acessibilidade, teclado e `autoComplete` certos, erro ao lado do campo, confirmação antes de remover, reticências em estados de carregamento).

- O nome da marca fica em `src/lib/theme.ts` (`brand.name`) e em `app.json`. Só tema claro.
- Abas: `Tabs` do Expo Router (JS). As abas nativas (`expo-router/native-tabs`) são uma troca possível depois.

## O que foi verificado e o que não foi

Verificado: `tsc` sem erros; build web; fluxo completo no navegador com Playwright em tela de celular (cadastro CPF e CNPJ, menor de 18, olho, login, abas, agente, conversa, QR de demonstração, chat de teste, criar agente até iniciar).

**Não** verificado: execução num iPhone/Android de verdade ou no Expo Go (não há como abrir aqui). Ficam só para conferir no aparelho: háptico, cofre `SecureStore`, teclado numérico, área segura (notch) e o visual das abas nativas.

O QR de demonstração é ilustrativo. Com a API ligada, o QR vem do WhatsApp (a conexão por QR é uma via não oficial, com risco de bloqueio do número).

## Estado dos itens 41–60 nos fronts (honesto)

Pronto no app: aviso de offline/erro (`NetworkBanner`), renovação automática do token, tela de erro/vazio, testes (`npm test`, 21), acessibilidade validada com axe (`e2e/`).
**Ainda sem tela** (o back-end já oferece a API): atendimento humano, busca/filtros/exportação, central de notificações, exceções/feriados, uso/custo de IA, registro do token de push. As telas Conversas, Estatísticas e Relatórios ainda usam dados de exemplo; ligá-las a `/api/agents/:id/conversations`, `/api/conversations/:id` e `/api/stats/weekly` é o próximo passo.
Testado de ponta a ponta contra o back-end Java: cadastro, criar agente, conectar (WhatsApp simulado), iniciar.
