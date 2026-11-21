// Validações e máscaras de CPF, CNPJ, data de nascimento e senha. Sem dependências.

// Só letras e números, em maiúsculas (o CNPJ passou a aceitar letras em 2026).
export const clean = (s: unknown) => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const allSame = (s: string) => /^(.)\1+$/.test(s);

export function isCPF(v: unknown) {
  const s = String(v || '').replace(/\D/g, '');
  if (s.length !== 11 || allSame(s)) return false;
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(s[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(s[9]) && dv(10) === Number(s[10]);
}

// Aceita o CNPJ numérico e o alfanumérico: cada caractere vale (código ASCII - 48); os 2 últimos são dígitos.
export function isCNPJ(v: unknown) {
  const s = clean(v);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(s) || allSame(s)) return false;
  const dv = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += (s.charCodeAt(i) - 48) * w[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(s[12]) && dv(13) === Number(s[13]);
}

function mask(s: string, parts: number[], seps: string[]) {
  let out = '', i = 0;
  parts.forEach((n, k) => {
    const piece = s.slice(i, i + n);
    if (!piece) return;
    out += (k ? seps[k - 1] : '') + piece;
    i += n;
  });
  return out;
}
export const maskCPF = (v: unknown) => mask(String(v || '').replace(/\D/g, '').slice(0, 11), [3, 3, 3, 2], ['.', '.', '-']);
export const maskCNPJ = (v: unknown) => mask(clean(v).slice(0, 14), [2, 3, 3, 4, 2], ['.', '.', '/', '-']);
// Tela de login: o campo é único, então a máscara é escolhida pelo que a pessoa digitou.
export const maskAuto = (v: unknown) => { const c = clean(v); return /^\d{0,11}$/.test(c) ? maskCPF(c) : maskCNPJ(c); };
export const docType = (v: unknown): 'cpf' | 'cnpj' | null => { const c = clean(v); return /^\d{11}$/.test(c) ? 'cpf' : c.length === 14 ? 'cnpj' : null; };
export const isDoc = (v: unknown) => (docType(v) === 'cpf' ? isCPF(v) : docType(v) === 'cnpj' ? isCNPJ(v) : false);

// Idade completa na data de hoje a partir de "AAAA-MM-DD" (null se a data não existe).
export function ageFrom(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const [y, mo, d] = m.slice(1).map(Number) as [number, number, number];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  const now = new Date();
  let a = now.getFullYear() - y;
  if (now.getMonth() < mo - 1 || (now.getMonth() === mo - 1 && now.getDate() < d)) a--;
  return a;
}
export const MIN_AGE = 18;
// Campo de data em texto (DD/MM/AAAA): funciona igual em iOS, Android e web.
export const maskDate = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 8); return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/'); };
export const dateToISO = (br: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

export const passwordRules = (p: string) => ({ len: p.length >= 8, letter: /[A-Za-z]/.test(p), digit: /\d/.test(p) });
export const passwordOk = (p: string) => Object.values(passwordRules(p)).every(Boolean);

// Valida o formulário de cadastro. Devolve { campo: 'mensagem' } (vazio = tudo certo).
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export type SignupForm = { document: string; name: string; email: string; company: string; birth: string; password: string; confirm: string };
export function validateSignup(type: 'cpf' | 'cnpj', f: SignupForm) {
  const e: Partial<Record<keyof SignupForm, string>> = {};
  const cpf = type === 'cpf';
  if (!f.document.trim()) e.document = cpf ? 'Informe o CPF.' : 'Informe o CNPJ.';
  else if (!(cpf ? isCPF(f.document) : isCNPJ(f.document))) e.document = `${cpf ? 'CPF' : 'CNPJ'} inválido. Confira os números.`;

  if (!cpf && f.company.trim().length < 2) e.company = 'Informe o nome da empresa.';
  if (f.name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = 'Informe nome e sobrenome.';

  const age = ageFrom(dateToISO(f.birth));
  if (!f.birth) e.birth = 'Informe a data de nascimento.';
  else if (!dateToISO(f.birth)) e.birth = 'Use o formato DD/MM/AAAA.';
  else if (age === null || age > 120) e.birth = 'Data de nascimento inválida.';
  else if (age < MIN_AGE) e.birth = `É preciso ter ${MIN_AGE} anos ou mais para criar uma conta.`;

  if (!f.email.trim()) e.email = 'Informe o e-mail.';
  else if (!isEmail(f.email)) e.email = 'E-mail inválido. Confira se digitou tudo.';

  if (!passwordOk(f.password)) e.password = 'Use pelo menos 8 caracteres, com letras e números.';
  if (!f.confirm) e.confirm = 'Confirme a senha.';
  else if (f.confirm !== f.password) e.confirm = 'As senhas não são iguais.';
  return e;
}
