import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuth, type ResetRequest } from '../../lib/auth';
import { useTheme } from '../../lib/ThemeContext';
import { color } from '../../lib/theme';
import { isEmail, passwordOk, passwordRules } from '../../lib/validators';
import AuthFrame from '../../components/AuthFrame';
import { Screen } from '../../components/Screen';
import { Button, ErrorText, haptic, Icon, LinkButton, Notice, PasswordField, Reveal, T, TextField, type InputRef } from '../../components/ui';

type Step = 'email' | 'code' | 'new' | 'done';
const STEPS: Step[] = ['email', 'code', 'new'];
const RULES: ['len' | 'letter' | 'digit', string][] = [['len', '8 ou mais caracteres'], ['letter', 'uma letra'], ['digit', 'um número']];
const TITLES: Record<Step, [string, string]> = {
  email: ['Esqueceu a senha?', 'Informe o e-mail que você usou ao criar a conta e enviaremos um código para ele.'],
  code: ['Digite o código', ''],
  new: ['Crie uma nova senha', 'Use uma senha que você ainda não usou nesta conta.'],
  done: ['Senha alterada', 'Pronto! Agora é só entrar com a nova senha.'],
};

// Recuperar a senha: 1) e-mail da conta, 2) código recebido por e-mail, 3) nova senha.
export default function Recuperar() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { requestReset, verifyReset, resetPassword } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState<ResetRequest>({});
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errs, setErrs] = useState<{ email?: string; code?: string; pw?: string; pw2?: string }>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const refs = { email: useRef<InputRef>(null), code: useRef<InputRef>(null), pw: useRef<InputRef>(null), pw2: useRef<InputRef>(null) };

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const fail = (e: unknown) => { haptic.error(); setErr((e as Error).message); };
  const send = async (again = false) => {
    setErr('');
    if (!email.trim()) { setErrs({ email: 'Informe o e-mail da conta.' }); haptic.error(); refs.email.current?.focus(); return; }
    if (!isEmail(email)) { setErrs({ email: 'E-mail inválido. Confira se digitou tudo.' }); haptic.error(); refs.email.current?.focus(); return; }
    setErrs({}); setBusy(true);
    try {
      const r = await requestReset(email);
      setInfo(r);
      setCode(''); setWait(30); haptic.light(); if (!again) setStep('code');
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const verify = async () => {
    setErr('');
    if (code.length !== 6) { setErrs({ code: 'Digite os 6 números do código.' }); haptic.error(); refs.code.current?.focus(); return; }
    setErrs({}); setBusy(true);
    try { setToken(await verifyReset(email, code)); haptic.success(); setStep('new'); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const save = async () => {
    setErr('');
    const x: typeof errs = {};
    if (!passwordOk(pw)) x.pw = 'Use pelo menos 8 caracteres, com letras e números.';
    if (!pw2) x.pw2 = 'Confirme a nova senha.'; else if (pw2 !== pw) x.pw2 = 'As senhas não são iguais.';
    setErrs(x);
    if (x.pw || x.pw2) { haptic.error(); (x.pw ? refs.pw : refs.pw2).current?.focus(); return; }
    setBusy(true);
    try { await resetPassword(email, token, pw); haptic.success(); setStep('done'); } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const rules = passwordRules(pw);
  const idx = STEPS.indexOf(step);
  const [title, sub] = TITLES[step];
  return (
    <AuthFrame>
      <Screen plain center width={440}>
        <View style={{ gap: 12, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={step === 'done' ? 'Concluído' : `Etapa ${idx + 1} de 3`}>
            {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step === 'done' || i <= idx ? color.primary : color.line }} />)}
          </View>
          <Reveal i={1}><T v="display" accessibilityRole="header">{title}</T></Reveal>
          {step === 'code' ? (
            <T c="muted">{info.maskedEmail ? <>Enviamos um código de 6 números para <T v="label">{info.maskedEmail}</T>. Ele vale por 10 minutos.</> : 'Se houver uma conta com esse e-mail, enviamos um código de 6 números para ele. Ele vale por 10 minutos.'}</T>
          ) : <T c="muted">{sub}</T>}
        </View>

        <Reveal i={2} style={{ gap: 16 }} key={step}>
          <ErrorText>{err}</ErrorText>

          {step === 'email' && (
            <>
              <TextField ref={refs.email} label="E-mail da conta" value={email} onChangeText={setEmail} error={errs.email} placeholder="voce@empresa.com.br" keyboardType="email-address" inputMode="email" autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="email" textContentType="emailAddress" maxLength={120} returnKeyType="send" onSubmitEditing={() => send()} />
              <Button label={busy ? 'Enviando…' : 'Enviar código'} loading={busy} onPress={() => send()} />
            </>
          )}

          {step === 'code' && (
            <>
              {info.demoCode && (
                <Notice title="Modo demonstração">
                  <T v="small" c="goldDeep">Esta versão de teste não envia e-mail de verdade. Seu código é:</T>
                  <T v="display" c="goldDeep" num style={{ letterSpacing: 8, fontSize: 30 }} accessibilityLabel={`Código de demonstração: ${info.demoCode.split('').join(' ')}`}>{info.demoCode}</T>
                </Notice>
              )}
              <TextField ref={refs.code} label="Código de 6 números" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} error={errs.code} placeholder="••••••" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} returnKeyType="go" onSubmitEditing={verify}
                style={{ fontSize: 26, letterSpacing: 10, textAlign: 'center', fontWeight: '700' }} />
              <Button label={busy ? 'Conferindo…' : 'Confirmar código'} loading={busy} onPress={verify} />
              <View style={{ alignItems: 'center' }}>
                {wait > 0 ? <T v="small" c="muted" num accessibilityLiveRegion="polite">Você pode pedir outro código em {wait} s</T> : <LinkButton label="Enviar outro código" onPress={() => send(true)} />}
              </View>
            </>
          )}

          {step === 'new' && (
            <>
              <PasswordField ref={refs.pw} label="Nova senha" value={pw} onChangeText={setPw} error={errs.pw} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" onSubmitEditing={() => refs.pw2.current?.focus()} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: -8 }} accessibilityLabel="Requisitos da senha">
                {RULES.map(([r, t]) => (
                  <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name={rules[r] ? 'check' : 'minus'} size={14} c={rules[r] ? 'success' : 'muted'} /><T v="small" c={rules[r] ? 'success' : 'muted'}>{t}{rules[r] ? ' (ok)' : ''}</T></View>
                ))}
              </View>
              <PasswordField ref={refs.pw2} label="Confirmar nova senha" value={pw2} onChangeText={setPw2} error={errs.pw2} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={save} />
              <Button label={busy ? 'Salvando…' : 'Salvar nova senha'} loading={busy} onPress={save} />
            </>
          )}

          {step === 'done' && (
            <>
              <Animated.View entering={ZoomIn.duration(450)} style={{ alignSelf: 'flex-start', width: 64, height: 64, borderRadius: 32, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={32} c="success" /></Animated.View>
              <Button label="Entrar" onPress={() => router.navigate('/login')} />
            </>
          )}
        </Reveal>

        {step !== 'done' && (
          <View style={{ alignItems: 'center' }}>
            {step === 'code' ? <LinkButton label="Usar outro e-mail" onPress={() => { setErr(''); setStep('email'); }} /> : <LinkButton label="Voltar para entrar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))} />}
          </View>
        )}
      </Screen>
    </AuthFrame>
  );
}
