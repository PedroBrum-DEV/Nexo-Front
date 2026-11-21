// Estado da conexão com o servidor: vira "sem conexão" quando uma chamada falha antes de ter resposta, e volta ao normal na próxima que responde.
type Listener = () => void;
let offline = false;
const listeners = new Set<Listener>();

export const isOffline = () => offline;
export const subscribeNet = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function setOffline(v: boolean) {
  if (v === offline) return;
  offline = v;
  listeners.forEach((l) => l());
}
