// Falha o build na Vercel se o app fosse publicado em modo DEMONSTRAÇÃO (sem API) ou apontando para um endereço inseguro.
const url = process.env.EXPO_PUBLIC_API_URL || '';
const onVercel = !!process.env.VERCEL;
if (!onVercel) process.exit(0);                       // localmente você pode testar a demonstração à vontade
const fail = (m) => { console.error('\n✖ ' + m + '\n'); process.exit(1); };
if (!url) fail('EXPO_PUBLIC_API_URL não está definida. Sem ela o app publicaria em modo demonstração (dados fictícios). Defina em Vercel > Settings > Environment Variables, com o endereço da API (https://...onrender.com).');
if (!/^https:\/\/[^\s/]+(\/.*)?$/.test(url)) fail('EXPO_PUBLIC_API_URL precisa começar com https:// (recebido: ' + url + ').');
if (/\/$/.test(url)) fail('EXPO_PUBLIC_API_URL não deve terminar com barra (recebido: ' + url + ').');
console.log('✔ EXPO_PUBLIC_API_URL = ' + url);
