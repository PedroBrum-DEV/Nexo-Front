// Leitura (sem validar assinatura: quem valida é o servidor) das datas do token para decidir quando renová-lo.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64urlToUtf8(s: string): string {
  const clean = s.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let bits = 0, acc = 0, out = '';
  for (const ch of clean) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('base64 inválido');
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 0xff); acc &= (1 << bits) - 1; }
  }
  return decodeURIComponent(out.split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
}

export function jwtClaims(token: string | null | undefined): { iat?: number; exp?: number } | null {
  if (!token) return null;
  const p = token.split('.');
  if (p.length !== 3) return null;
  try {
    const c = JSON.parse(b64urlToUtf8(p[1]!));
    return { iat: typeof c.iat === 'number' ? c.iat : undefined, exp: typeof c.exp === 'number' ? c.exp : undefined };
  } catch { return null; }
}

const DAY = 86_400_000;
/** Renova quando o token tem mais de 1 dia (a sessão vale 7 dias, então ela nunca expira em quem usa o app) e ainda não venceu. */
export function shouldRefresh(token: string | null | undefined, now = Date.now(), minAge = DAY): boolean {
  const c = jwtClaims(token);
  if (!c || c.iat === undefined || c.exp === undefined) return false;
  if (c.exp * 1000 <= now) return false;       // já venceu: renovar não adianta, o servidor vai pedir novo login
  return now - c.iat * 1000 >= minAge;
}
