import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// BASE é lido na hora do import, então o endereço da API é definido antes.
process.env.EXPO_PUBLIC_API_URL = 'http://servidor.teste';

const json = (status: number, body: unknown) => Promise.resolve({ status, ok: status < 400, json: () => Promise.resolve(body) } as Response);

describe('chamadas à API e estado de conexão', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('falha de rede marca "sem conexão" e a próxima resposta desmarca', async () => {
    const net = await import('../net');
    const { remote } = await import('../api');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(() => json(200, [])));
    await expect(remote.list()).rejects.toThrow('Não consegui falar com o servidor');
    expect(net.isOffline()).toBe(true);
    await remote.list();
    expect(net.isOffline()).toBe(false);
  });

  it('erro do servidor (500) não conta como sem conexão e mostra a mensagem dele', async () => {
    const net = await import('../net');
    const { remote } = await import('../api');
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => json(500, { error: 'Erro interno. Tente de novo em instantes.' })));
    await expect(remote.list()).rejects.toThrow('Erro interno');
    expect(net.isOffline()).toBe(false);
  });

  it('401 com sessão chama o retorno ao login; sem sessão (login errado) não chama', async () => {
    const { remote, setOnUnauthorized, setSessionToken } = await import('../api');
    const out = vi.fn(); setOnUnauthorized(out);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => json(401, { error: 'CPF/CNPJ ou senha incorretos.' })));
    await expect(remote.login({})).rejects.toThrow('incorretos');
    expect(out).not.toHaveBeenCalled();
    setSessionToken('tok');
    await expect(remote.list()).rejects.toThrow();
    expect(out).toHaveBeenCalledTimes(1);
  });

  it('manda o token e demora demais vira erro claro', async () => {
    vi.useFakeTimers();
    const { remote, setSessionToken } = await import('../api');
    setSessionToken('abc');
    const f = vi.fn().mockImplementation((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal!.addEventListener('abort', () => rej(new Error('abort')))));
    vi.stubGlobal('fetch', f);
    const p = remote.list();
    const assertion = expect(p).rejects.toThrow('demorou demais');
    await vi.advanceTimersByTimeAsync(21_000);
    await assertion;
    expect((f.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer abc' });
  });

  it('ping responde true e limpa o aviso', async () => {
    const net = await import('../net');
    const { ping } = await import('../api');
    net.setOffline(true);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => json(200, { ok: true })));
    expect(await ping()).toBe(true);
    expect(net.isOffline()).toBe(false);
  });
});
