import { router } from 'expo-router';
// Volta uma tela; se a tela foi aberta por link direto (sem histórico), vai para a lista de agentes.
export const leave = () => (router.canGoBack() ? router.back() : router.replace('/agentes'));
