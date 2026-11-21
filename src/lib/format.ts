export const fmtPhone = (n?: string | null) => {
  const d = String(n || '').replace(/\D/g, '');
  return d.length >= 12 ? `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, -4)}-${d.slice(-4)}` : d ? `+${d}` : '';
};
export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const initials = (name: string) => name.split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';
