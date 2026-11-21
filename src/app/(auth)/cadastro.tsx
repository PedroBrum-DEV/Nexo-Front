import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/ThemeContext';
import { dateToISO, maskCNPJ, maskCPF, maskDate, passwordRules, validateSignup, type SignupForm } from '../../lib/validators';
import { Logo } from '../../components/Logo';
import AuthFrame from '../../components/AuthFrame';
import { useLayout } from '../../lib/layout';
import { Button, Divider, ErrorText, haptic, Icon, LinkButton, PasswordField, Pill, Reveal, T, Tap, TextField, type InputRef } from '../../components/ui';
import { Screen } from '../../components/Screen';

type Kind = 'cpf' | 'cnpj';
const KINDS: Record<Kind, { title: string; sub: string; doc: string; ph: string; name: string; birth: string; mask: (v: string) => string }> = {
  cpf: { title: 'Pessoa física', sub: 'Conta com o seu CPF', doc: 'CPF', ph: '000.000.000-00', name: 'Nome completo', birth: 'Data de nascimento', mask: maskCPF },
  cnpj: { title: 'Empresa', sub: 'Conta com o CNPJ', doc: 'CNPJ', ph: '00.000.000/0000-00', name: 'Nome do responsável', birth: 'Data de nascimento do responsável', mask: maskCNPJ },
};
const EMPTY: SignupForm = { document: '', name: '', email: '', company: '', birth: '', password: '', confirm: '' };
const ORDER: (keyof SignupForm)[] = ['company', 'document', 'name', 'birth', 'email', 'password', 'confirm'];
const RULES: ['len' | 'letter' | 'digit', string][] = [['len', '8 ou mais caracteres'], ['letter', 'uma letra'], ['digit', 'um número']];

export default function Cadastro() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { register } = useAuth();
  const { wide } = useLayout();
  const [type, setType] = useState<Kind | null>(null);
  const [f, setF] = useState<SignupForm>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof SignupForm, boolean>>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = useRef<Partial<Record<keyof SignupForm, InputRef | null>>>({});
  const k = type ? KINDS[type] : null;
  const errors = type ? validateSignup(type, f) : {};
  const show = (key: keyof SignupForm) => (touched[key] ? errors[key] : undefined);
  const set = (key: keyof SignupForm) => (v: string) => setF((x) => ({ ...x, [key]: v }));
  const blur = (key: keyof SignupForm) => () => setTouched((t) => ({ ...t, [key]: true }));
  const pick = (t: Kind | null) => { haptic.select(); setType(t); setF(EMPTY); setTouched({}); setErr(''); };
  const rules = passwordRules(f.password);
  const ref = (key: keyof SignupForm) => (el: InputRef | null) => { refs.current[key] = el; };
  const next = (key: keyof SignupForm) => () => refs.current[key]?.focus();

  const submit = async () => {
    if (!type) return;
    setTouched({ document: true, name: true, email: true, company: true, birth: true, password: true, confirm: true });
    const first = ORDER.find((x) => errors[x]);
    if (first) { haptic.error(); refs.current[first]?.focus(); return; }
    setBusy(true); setErr('');
    try { await register({ type, document: f.document, name: f.name, email: f.email, company: f.company, birthISO: dateToISO(f.birth), password: f.password }); haptic.success(); }
    catch (e) { haptic.error(); setErr((e as Error).message); setBusy(false); }
  };

  return (
    <AuthFrame><Screen plain center width={480}>
      <View style={{ gap: 12, marginTop: 24 }}>
        <Reveal i={2}><T v="display" accessibilityRole="header">Criar conta</T></Reveal>
      </View>

      {!type || !k ? (
        <View style={{ gap: 4 }}>
          <T c="muted" style={{ marginBottom: 8 }}>Como você vai usar a conta?</T>
          <Divider />
          {(Object.keys(KINDS) as Kind[]).map((t) => (
            <View key={t}>
              <Tap accessibilityRole="radio" accessibilityState={{ checked: false }} {...({ 'aria-checked': false } as object)} accessibilityLabel={`${KINDS[t].title}. ${KINDS[t].sub}`} onPress={() => pick(t)} scale={0.99} style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}><T v="title">{KINDS[t].title}</T><T v="small" c="muted">{KINDS[t].sub}</T></View>
                <Icon name="chevron-right" size={22} c="muted" />
              </Tap>
              <Divider />
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pill>{`${k.title} · ${k.doc}`}</Pill>
            <LinkButton label="Trocar" onPress={() => pick(null)} />
          </View>
          <ErrorText>{err}</ErrorText>
          {type === 'cnpj' && (
            <TextField ref={ref('company')} label="Nome da empresa" value={f.company} onChangeText={set('company')} onBlur={blur('company')} error={show('company')} placeholder="Razão social ou nome fantasia" maxLength={80} autoComplete="organization" returnKeyType="next" onSubmitEditing={next('document')} />
          )}
          <TextField
            ref={ref('document')} label={k.doc} value={f.document} onChangeText={(v) => set('document')(k.mask(v))} onBlur={blur('document')} error={show('document')} placeholder={k.ph}
            keyboardType={type === 'cpf' ? 'number-pad' : 'default'} autoCapitalize="characters" autoCorrect={false} spellCheck={false} autoComplete="off" maxLength={18} returnKeyType="next" onSubmitEditing={next('name')}
          />
          <TextField ref={ref('name')} label={k.name} value={f.name} onChangeText={set('name')} onBlur={blur('name')} error={show('name')} placeholder="Nome e sobrenome" maxLength={80} autoComplete="name" textContentType="name" autoCapitalize="words" returnKeyType="next" onSubmitEditing={next('birth')} />
          <TextField
            ref={ref('birth')} label={k.birth} value={f.birth} onChangeText={(v) => set('birth')(maskDate(v))} onBlur={blur('birth')} error={show('birth')} hint="É preciso ter 18 anos ou mais." placeholder="DD/MM/AAAA"
            keyboardType="number-pad" autoComplete="birthdate-full" maxLength={10} returnKeyType="next" onSubmitEditing={next('email')}
          />
          <TextField ref={ref('email')} label="E-mail" value={f.email} onChangeText={set('email')} onBlur={blur('email')} error={show('email')} hint="Usado para recuperar a senha." placeholder="voce@empresa.com.br" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="email" textContentType="emailAddress" maxLength={120} returnKeyType="next" onSubmitEditing={next('password')} />
          <PasswordField ref={ref('password')} label="Criar senha" value={f.password} onChangeText={set('password')} onBlur={blur('password')} error={show('password')} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" onSubmitEditing={next('confirm')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: -8 }} accessibilityLabel="Requisitos da senha">
            {RULES.map(([r, t]) => (
              <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={rules[r] ? 'check' : 'minus'} size={14} c={rules[r] ? 'success' : 'muted'} />
                <T v="small" c={rules[r] ? 'success' : 'muted'}>{t}{rules[r] ? ' (ok)' : ''}</T>
              </View>
            ))}
          </View>
          <PasswordField ref={ref('confirm')} label="Confirmar senha" value={f.confirm} onChangeText={set('confirm')} onBlur={blur('confirm')} error={show('confirm')} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
          <Button label={busy ? 'Criando…' : 'Criar conta'} onPress={submit} loading={busy} />
        </View>
      )}

      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <T c="muted">Já tem conta?</T>
        <Link href="/login" accessibilityRole="link"><T v="label" c="primary">Entrar</T></Link>
      </View>
    </Screen></AuthFrame>
  );
}
