import { describe, expect, it } from 'vitest';
import { canContact, canPreview, contactLine, eta, matches, searchError, toggle, type Company, type Status } from '../radar';

const co = (over: Partial<Company> = {}): Company => ({ id: 'c', company: 'Barbearia Alfa', score: 80, status: 'novo', needs: [], hasSite: true, photos: [], ...over });
const fmt = (n?: string | null) => (n ? `+${n}` : '');

describe('radar', () => {
  it('filtra as empresas como o servidor conta', () => {
    const s = (status: Status, extra: Partial<Company> = {}) => co({ status, ...extra });
    expect(matches(s('novo'), 'pending')).toBe(true);
    expect(matches(s('aprovado'), 'pending')).toBe(true);
    expect(matches(s('enviado'), 'pending')).toBe(false);
    expect(['enviado', 'respondeu', 'fechou'].map((x) => matches(s(x as Status), 'contacted'))).toEqual([true, true, true]);
    expect(matches(s('nao_contatar'), 'contacted')).toBe(false);
    expect(matches(s('respondeu'), 'replied')).toBe(true);
    expect(matches(s('fechou'), 'replied')).toBe(true);
    expect(matches(s('respondeu', { negState: 'ativa' }), 'negotiating')).toBe(true);
    expect(matches(s('respondeu', { negState: '' }), 'negotiating')).toBe(false);
    expect(matches(s('fechou'), 'closed')).toBe(true);
    expect(matches(s('descartado'), 'discarded')).toBe(true);
    expect(matches(s('descartado'), 'all')).toBe(true);
  });

  it('só dá para contatar quem ainda não foi contatada nem descartada', () => {
    expect(canContact(co({ status: 'novo' }))).toBe(true);
    expect(canContact(co({ status: 'aprovado' }))).toBe(true);
    for (const st of ['fila', 'enviado', 'respondeu', 'fechou', 'descartado', 'nao_contatar'] as Status[]) expect(canContact(co({ status: st }))).toBe(false);
  });

  it('esboço só quando há necessidade identificada', () => {
    expect(canPreview(co({ offerType: 'agendamento' }))).toBe(true);
    expect(canPreview(co({ offerType: 'site' }))).toBe(true);
    expect(canPreview(co({ offerType: 'nenhum' }))).toBe(false);
    expect(canPreview(co({ offerType: null }))).toBe(false);
  });

  it('diz quando a resposta sai', () => {
    const now = 1_000_000_000;
    expect(eta(now + 10_000, now)).toBe('agora');
    expect(eta(now - 5_000, now)).toBe('agora');
    expect(eta(now + 3 * 60_000, now)).toBe('em 3 min');
    expect(eta(now + 59 * 60_000, now)).toBe('em 59 min');
    expect(eta(now + 60 * 60_000, now)).toBe('em 1 h');
    expect(eta(now + 80 * 60_000, now)).toBe('em 1 h 20 min');
  });

  it('valida o formulário de pesquisa', () => {
    expect(searchError('', ['sem_site'])).toContain('localização');
    expect(searchError('   ', ['sem_site'])).toContain('localização');
    expect(searchError('Campinas', [])).toContain('tipo de problema');
    expect(searchError('Campinas, SP', ['sem_site'])).toBe('');
  });

  it('liga e desliga um item da lista sem mexer na original', () => {
    const a = ['sem_site'] as const;
    expect(toggle([...a], 'site_desatualizado' as never)).toEqual(['sem_site', 'site_desatualizado']);
    expect(toggle(['sem_site', 'site_desatualizado'] as never[], 'sem_site' as never)).toEqual(['site_desatualizado']);
    expect(a).toEqual(['sem_site']);
  });

  it('mostra os contatos achados', () => {
    expect(contactLine(co({ whatsapp: '5519911110001', email: 'oi@alfa.test' }), fmt)).toBe('WhatsApp +5519911110001 · oi@alfa.test');
    expect(contactLine(co({ email: 'x@y.com', phone: '551133334444' }), fmt)).toBe('x@y.com · Tel. +551133334444');
    expect(contactLine(co({}), fmt)).toBe('Sem contato');
  });
});
