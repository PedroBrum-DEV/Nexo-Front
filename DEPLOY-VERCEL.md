# Subir o nexo-front para testes (Vercel)

Pré-requisito: a API (`nexo-back`) já no ar no Render, com o endereço em mãos (`https://SEU-SERVICO.onrender.com`).

1. Vercel → **Add New → Project** → este repositório. O `vercel.json` já define instalação, build (`npm run export:web`), pasta de saída (`dist`) e a reescrita de todas as rotas para `index.html` (sem ela, recarregar `/agenda` dá 404). **Root Directory: deixe vazio (raiz).**
2. Environment Variables → `EXPO_PUBLIC_API_URL` = `https://SEU-SERVICO.onrender.com` (https, **sem barra no fim**). Se faltar ou estiver errada, o build falha de propósito (para o app não subir em modo demonstração com dados fictícios).
3. Deploy e anote o endereço (`https://nexo-xxxx.vercel.app`).
4. **Volte ao Render** e coloque esse endereço em `CORS_ORIGINS` (sem barra no fim). Sem isso o navegador bloqueia as chamadas à API.
5. Teste: abra o endereço → crie uma conta → crie um agente → **Testar agente** → peça uma reunião → veja **Agenda** e **Avisos** → recarregue `/agenda` (não pode dar 404).

Cuidados: nunca use `EXPO_PUBLIC_*` para chaves secretas (vão para o pacote do navegador); previews da Vercel têm outro endereço e ficam sem acesso à API até serem listados no `CORS_ORIGINS`; o cadastro não tem confirmação de e-mail, então convide só pessoas conhecidas.
