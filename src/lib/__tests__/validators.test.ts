import { describe, expect, it } from 'vitest';
import { ageFrom, dateToISO, isCNPJ, isCPF, isDoc, isEmail, maskAuto, maskDate, passwordOk } from '../validators';

describe('CPF e CNPJ', () => {
  it('aceita documentos válidos, com ou sem máscara', () => {
    expect(isCPF('529.982.247-25')).toBe(true);
    expect(isCPF('52998224725')).toBe(true);
    expect(isCNPJ('11.222.333/0001-81')).toBe(true);
  });
  it('aceita o CNPJ alfanumérico', () => expect(isCNPJ('12.ABC.345/01DE-35')).toBe(true));
  it('recusa dígito errado, repetidos e tamanho errado', () => {
    expect(isCPF('529.982.247-24')).toBe(false);
    expect(isCPF('111.111.111-11')).toBe(false);
    expect(isCPF('123')).toBe(false);
    expect(isCNPJ('11.222.333/0001-82')).toBe(false);
    expect(isCNPJ('00000000000000')).toBe(false);
  });
  it('isDoc escolhe CPF ou CNPJ pelo tamanho', () => {
    expect(isDoc('52998224725')).toBe(true);
    expect(isDoc('11222333000181')).toBe(true);
    expect(isDoc('5299822472')).toBe(false);
  });
  it('a máscara se ajusta ao que a pessoa digita', () => {
    expect(maskAuto('52998224725')).toBe('529.982.247-25');
    expect(maskAuto('11222333000181')).toBe('11.222.333/0001-81');
  });
});

describe('data de nascimento e idade', () => {
  it('máscara e conversão DD/MM/AAAA → ISO', () => {
    expect(maskDate('10051990')).toBe('10/05/1990');
    expect(dateToISO('10/05/1990')).toBe('1990-05-10');
    expect(ageFrom(dateToISO('31/02/1990')!)).toBeNull(); // data que não existe
  });
  it('calcula a idade completa', () => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 18); d.setDate(d.getDate() + 1);
    expect(ageFrom(d.toISOString().slice(0, 10))).toBe(17);
    d.setDate(d.getDate() - 1);
    expect(ageFrom(d.toISOString().slice(0, 10))).toBe(18);
  });
});

describe('senha e e-mail', () => {
  it('senha: 8+ caracteres com letra e número', () => {
    expect(passwordOk('abc12345')).toBe(true);
    expect(passwordOk('abcdefgh')).toBe(false);
    expect(passwordOk('12345678')).toBe(false);
    expect(passwordOk('ab12')).toBe(false);
  });
  it('e-mail', () => {
    expect(isEmail('maria@exemplo.com')).toBe(true);
    expect(isEmail('maria@exemplo')).toBe(false);
    expect(isEmail('maria exemplo@x.com')).toBe(false);
  });
});
