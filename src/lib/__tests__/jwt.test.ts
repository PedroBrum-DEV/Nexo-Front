import { describe, expect, it } from 'vitest';
import { jwtClaims, shouldRefresh } from '../jwt';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const tok = (iat: number, exp: number) => `${b64({ alg: 'HS256' })}.${b64({ sub: '1', iat, exp })}.assinatura`;
const NOW = 1_800_000_000_000;
const s = (ms: number) => Math.floor(ms / 1000);

describe('jwtClaims', () => {
  it('lê iat e exp', () => expect(jwtClaims(tok(10, 20))).toEqual({ iat: 10, exp: 20 }));
  it('devolve null para lixo', () => {
    expect(jwtClaims(null)).toBeNull();
    expect(jwtClaims('abc')).toBeNull();
    expect(jwtClaims('a.@@@.c')).toBeNull();
  });
  it('lê acentos no payload', () => {
    const t = `x.${Buffer.from(JSON.stringify({ iat: 1, exp: 2, name: 'João' })).toString('base64url')}.y`;
    expect(jwtClaims(t)).toEqual({ iat: 1, exp: 2 });
  });
});

describe('shouldRefresh', () => {
  const day = 86_400_000;
  it('não renova token recém-criado', () => expect(shouldRefresh(tok(s(NOW - 3600_000), s(NOW + 7 * day)), NOW)).toBe(false));
  it('renova com mais de 1 dia', () => expect(shouldRefresh(tok(s(NOW - 2 * day), s(NOW + 5 * day)), NOW)).toBe(true));
  it('não tenta renovar token vencido', () => expect(shouldRefresh(tok(s(NOW - 9 * day), s(NOW - 2 * day)), NOW)).toBe(false));
  it('ignora token ilegível ou sem datas', () => {
    expect(shouldRefresh('lixo', NOW)).toBe(false);
    expect(shouldRefresh(null, NOW)).toBe(false);
  });
});
