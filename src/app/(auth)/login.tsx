import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { color } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { isDoc, maskAuto } from '../../lib/validators';
import { Logo } from '../../components/Logo';
import AuthFrame from '../../components/AuthFrame';
import { useLayout } from '../../lib/layout';
import { Button, ErrorText, haptic, LinkButton, PasswordField, Reveal, T, TextField, type InputRef } from '../../components/ui';
import { Screen } from '../../components/Screen';

export default function Login() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { login } = useAuth();
  const { wide } = useLayout();
  const { msg } = useLocalSearchParams<{ msg?: string }>();
  const [doc, setDoc] = useState('');
  const [pw, setPw] = useState('');
  const [errs, setErrs] = useState<{ doc?: string; pw?: string }>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const docRef = useRef<InputRef>(null);
  const pwRef = useRef<InputRef>(null);

  const submit = async () => {
    const x: { doc?: string; pw?: string } = {};
    if (!isDoc(doc)) x.doc = 'Informe um CPF ou CNPJ válido.';
    if (!pw) x.pw = 'Informe a senha.';
    setErrs(x); setErr('');
    if (x.doc || x.pw) { haptic.error(); (x.doc ? docRef : pwRef).current?.focus(); return; }
    setBusy(true);
    try { await login(doc, pw); haptic.success(); } catch (e) { haptic.error(); setErr((e as Error).message); setBusy(false); }
  };

  return (
    <AuthFrame><Screen plain center width={440}>
      <View style={{ gap: 12, marginTop: 24 }}>
        <Reveal i={2}><T v="display" accessibilityRole="header">Entrar</T></Reveal>
        <Reveal i={3}><T c="muted">Use o CPF ou o CNPJ da sua conta.</T></Reveal>
      </View>
      <Reveal i={4} style={{ gap: 16 }}>
        {msg === 'excluida' && <View style={{ backgroundColor: color.successSoft, borderRadius: 12, padding: 12 }} accessibilityRole="alert"><T v="small" c="success" style={{ fontWeight: '600' }}>Sua conta foi excluída e os dados foram apagados.</T></View>}
        <ErrorText>{err}</ErrorText>
        <TextField
          ref={docRef} label="CPF ou CNPJ" value={doc} onChangeText={(v) => setDoc(maskAuto(v))} error={errs.doc} placeholder="000.000.000-00"
          autoCapitalize="characters" autoCorrect={false} spellCheck={false} autoComplete="username" textContentType="username" returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} maxLength={18}
        />
        <PasswordField ref={pwRef} label="Senha" value={pw} onChangeText={setPw} error={errs.pw} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
        <View style={{ alignItems: 'flex-end', marginTop: -8 }}><LinkButton label="Esqueceu a senha?" onPress={() => router.push({ pathname: '/recuperar', params: {} })} /></View>
        <Button label={busy ? 'Entrando…' : 'Entrar'} onPress={submit} loading={busy} />
      </Reveal>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <T c="muted">Ainda não tem conta?</T>
        <Link href="/cadastro" accessibilityRole="link"><T v="label" c="primary">Criar conta</T></Link>
      </View>
    </Screen></AuthFrame>
  );
}
