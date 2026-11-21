import { useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useAuth, type AvatarChoice } from '../../../lib/auth';
import { useTheme } from '../../../lib/ThemeContext';
import { live } from '../../../lib/api';
import { useApp } from '../../../lib/store';
import { useLayout } from '../../../lib/layout';
import { color } from '../../../lib/theme';
import { maskCNPJ, maskCPF, passwordOk, passwordRules } from '../../../lib/validators';
import { AvatarView, PRESETS } from '../../../components/UserAvatar';
import { Screen } from '../../../components/Screen';
import { Button, Card, Divider, ErrorText, EyeIcon, haptic, Icon, PasswordField, Pill, Reveal, SectionTitle, Segmented, T, Tap, type InputRef } from '../../../components/ui';

type Panel = 'avatar' | 'senha' | null;
const RULES: ['len' | 'letter' | 'digit', string][] = [['len', '8 ou mais caracteres'], ['letter', 'uma letra'], ['digit', 'um número']];

function NavRow({ icon, label, hint, onPress }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; hint: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. ${hint}`} scale={0.99} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Icon name={icon} size={20} c="muted" />
      <View style={{ flex: 1 }}><T v="label" style={{ fontSize: 15 }}>{label}</T><T v="small" c="muted" numberOfLines={1}>{hint}</T></View>
      <Icon name="chevron-right" size={20} c="muted" />
    </Tap>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><T c="muted">{label}</T><View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{children}</View></View>;
}

export default function Conta() {
  const { user, avatar, setAvatar, changePassword, logout } = useAuth();
  const { say } = useApp();
  const { mode, setMode } = useTheme();
  const { wide } = useLayout();
  const [panel, setPanel] = useState<Panel>(null);
  const [showDoc, setShowDoc] = useState(false);
  // Foto ou avatar só valem depois de confirmar: antes disso é uma prévia (undefined = nada pendente; null = remover)
  const [draft, setDraft] = useState<AvatarChoice | undefined>(undefined);
  const [photoErr, setPhotoErr] = useState('');
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [errs, setErrs] = useState<Partial<Record<'current' | 'next' | 'confirm', string>>>({});
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const refs = useRef<Partial<Record<'current' | 'next' | 'confirm', InputRef | null>>>({});
  if (!user) return null;
  const shown = user.type === 'cnpj' ? user.company || user.name : user.name;
  const docFull = user.type === 'cpf' ? maskCPF(user.document) : maskCNPJ(user.document);
  const docHidden = user.type === 'cpf' ? `•••.•••.${docFull.slice(8, 11)}-${docFull.slice(12)}` : `••.•••.•••/••••-${docFull.slice(-2)}`;
  const docLabel = user.type === 'cpf' ? 'CPF' : 'CNPJ';
  const rules = passwordRules(f.next);
  const shownAvatar = draft !== undefined ? draft : avatar;
  const confirmAvatar = async () => { if (draft === undefined) return; await setAvatar(draft); haptic.success(); say(draft === null ? 'Foto removida.' : 'Foto de perfil atualizada.'); setDraft(undefined); };
  const cancelAvatar = () => { haptic.select(); setDraft(undefined); };

  const toggle = (p: Exclude<Panel, null>) => { haptic.select(); setPanel((x) => (x === p ? null : p)); setFormErr(''); };

  const pickPhoto = async () => {
    setPhotoErr(''); setBusyPhoto(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setPhotoErr('Permita o acesso às fotos nas configurações do aparelho para escolher uma foto.'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (r.canceled || !r.assets[0]) return;
      const out = await ImageManipulator.manipulateAsync(r.assets[0].uri, [{ resize: { width: 320 } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!out.base64) throw new Error('Não consegui ler essa imagem.');
      setDraft({ kind: 'photo', uri: `data:image/jpeg;base64,${out.base64}` });
      haptic.light();
    } catch (e) { haptic.error(); setPhotoErr((e as Error).message || 'Não consegui usar essa foto.'); } finally { setBusyPhoto(false); }
  };

  const savePassword = async () => {
    const e: typeof errs = {};
    if (!f.current) e.current = 'Informe a senha atual.';
    if (!passwordOk(f.next)) e.next = 'Use pelo menos 8 caracteres, com letras e números.';
    else if (f.next === f.current) e.next = 'A nova senha precisa ser diferente da atual.';
    if (!f.confirm) e.confirm = 'Confirme a nova senha.'; else if (f.confirm !== f.next) e.confirm = 'As senhas não são iguais.';
    setErrs(e); setFormErr('');
    const first = (['current', 'next', 'confirm'] as const).find((k) => e[k]);
    if (first) { haptic.error(); refs.current[first]?.focus(); return; }
    setSaving(true);
    try { await changePassword(f.current, f.next); haptic.success(); say('Senha alterada com sucesso.'); setF({ current: '', next: '', confirm: '' }); setPanel(null); }
    catch (er) { haptic.error(); setFormErr((er as Error).message); }
    setSaving(false);
  };

  const profile = (
    <Reveal i={0}>
      <Card style={{ gap: 20, alignItems: 'center' }}>
        <Tap onPress={() => toggle('avatar')} accessibilityRole="button" accessibilityLabel="Trocar foto de perfil" scale={0.96} style={{ width: 104, height: 104 }}>
          <AvatarView choice={shownAvatar} name={shown} size={104} />
          <View style={{ position: 'absolute', right: -2, bottom: -2, width: 36, height: 36, borderRadius: 18, backgroundColor: color.primary, borderWidth: 3, borderColor: color.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={16} c="onPrimary" /></View>
        </Tap>
        <View style={{ alignItems: 'center', gap: 2 }}><T v="title" numberOfLines={1} style={{ fontSize: 22 }}>{shown}</T><T v="small" c="muted">{user.type === 'cnpj' ? 'Conta de empresa' : 'Conta pessoal'}</T></View>
        <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
          <View style={{ flex: 1 }}><Button label={busyPhoto ? 'Abrindo…' : 'Enviar foto'} icon="upload" small variant="secondary" loading={busyPhoto} onPress={pickPhoto} /></View>
          <View style={{ flex: 1 }}><Button label="Avatares" icon="smile" small variant={panel === 'avatar' ? 'primary' : 'secondary'} onPress={() => toggle('avatar')} /></View>
        </View>
        {draft !== undefined && <Pill tone="gold">Prévia: toque em Confirmar para salvar</Pill>}
        {shownAvatar && draft === undefined && <Button label="Remover foto ou avatar" variant="ghost" small full={false} onPress={() => setDraft(null)} />}
        <ErrorText>{photoErr}</ErrorText>
      </Card>
    </Reveal>
  );

  const picker = panel === 'avatar' && (
    <Reveal i={0}>
      <Card style={{ gap: 16 }}>
        <SectionTitle>Escolha um avatar</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }} accessibilityRole="radiogroup">
          {PRESETS.map((p) => {
            const on = shownAvatar?.kind === 'preset' && shownAvatar.id === p.id;
            return (
              <Tap key={p.id} accessibilityRole="radio" accessibilityState={{ checked: on }} {...({ 'aria-checked': on } as object)} accessibilityLabel={p.name} onPress={() => { haptic.select(); setDraft({ kind: 'preset', id: p.id }); }} scale={0.9}
                style={{ width: wide ? 72 : '22%', aspectRatio: 1, flexGrow: wide ? 0 : 1, maxWidth: 84, borderRadius: 999, padding: 3, borderWidth: 3, borderColor: on ? color.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <AvatarView choice={{ kind: 'preset', id: p.id }} name={p.name} size={wide ? 60 : 56} />
                {on && <Animated.View entering={ZoomIn.duration(260)} style={{ position: 'absolute', right: -2, top: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} c="onPrimary" /></Animated.View>}
              </Tap>
            );
          })}
        </View>
      </Card>
    </Reveal>
  );

  const data = (
    <Reveal i={1}>
      <Card style={{ gap: 4 }}>
        <SectionTitle>Dados da conta</SectionTitle>
        <Divider />
        <Row label={user.type === 'cnpj' ? 'Empresa' : 'Nome'}><T v="label" numberOfLines={1}>{shown}</T></Row><Divider />
        {user.email && <><Row label="E-mail"><T v="label" numberOfLines={1}>{user.email}</T></Row><Divider /></>}
        {user.type === 'cnpj' && <><Row label="Responsável"><T v="label" numberOfLines={1}>{user.name}</T></Row><Divider /></>}
        <Row label={docLabel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T v="label" num accessibilityLabel={showDoc ? docFull : `${docLabel} oculto`}>{showDoc ? docFull : docHidden}</T>
            <Tap onPress={() => { haptic.select(); setShowDoc((v) => !v); }} accessibilityRole="button" accessibilityLabel={showDoc ? `Ocultar ${docLabel}` : `Mostrar ${docLabel}`} accessibilityState={{ selected: showDoc }} scale={0.88} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><EyeIcon open={showDoc} /></Tap>
          </View>
        </Row>
      </Card>
    </Reveal>
  );

  const security = (
    <Reveal i={2}>
      <Card style={{ gap: 12 }}>
        <SectionTitle>Segurança</SectionTitle>
        <Divider />
        <Row label="Senha">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><T v="label" c="muted">••••••••</T><Button label={panel === 'senha' ? 'Fechar' : 'Trocar senha'} small variant={panel === 'senha' ? 'ghost' : 'secondary'} full={false} onPress={() => toggle('senha')} /></View>
        </Row>
        {panel === 'senha' && (
          <Reveal i={0} style={{ gap: 16, paddingTop: 8 }}>
            <ErrorText>{formErr}</ErrorText>
            <PasswordField ref={(el) => { refs.current.current = el; }} label="Senha atual" value={f.current} onChangeText={(v) => setF({ ...f, current: v })} error={errs.current} autoComplete="current-password" textContentType="password" returnKeyType="next" onSubmitEditing={() => refs.current.next?.focus()} />
            <PasswordField ref={(el) => { refs.current.next = el; }} label="Nova senha" value={f.next} onChangeText={(v) => setF({ ...f, next: v })} error={errs.next} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" onSubmitEditing={() => refs.current.confirm?.focus()} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: -8 }} accessibilityLabel="Requisitos da nova senha">
              {RULES.map(([r, t]) => (
                <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name={rules[r] ? 'check' : 'minus'} size={14} c={rules[r] ? 'success' : 'muted'} /><T v="small" c={rules[r] ? 'success' : 'muted'}>{t}{rules[r] ? ' (ok)' : ''}</T></View>
              ))}
            </View>
            <PasswordField ref={(el) => { refs.current.confirm = el; }} label="Confirmar nova senha" value={f.confirm} onChangeText={(v) => setF({ ...f, confirm: v })} error={errs.confirm} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={savePassword} />
            <Button label={saving ? 'Salvando…' : 'Salvar nova senha'} loading={saving} onPress={savePassword} />
          </Reveal>
        )}
        <Divider />
        <NavRow icon="smartphone" label="Sessões ativas" hint="Aparelhos em que sua conta está aberta" onPress={() => router.push('/sessoes')} />
        <Divider />
        <NavRow icon="shield" label="Privacidade e dados" hint="Baixar meus dados ou excluir a conta" onPress={() => router.push('/privacidade')} />
      </Card>
    </Reveal>
  );

  const appearance = (
    <Reveal i={3}>
      <Card style={{ gap: 14 }}>
        <SectionTitle>Aparência</SectionTitle>
        <Segmented value={mode} onChange={setMode} options={[['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Escuro']]} />
        <T v="small" c="muted">“Sistema” segue o tema do seu aparelho.</T>
      </Card>
    </Reveal>
  );

  const pending = draft !== undefined;
  return (
    <Screen tabbed title="Conta" width={1040} footer={pending ? (
      <>
        <View style={{ flex: 1 }}><Button label="Cancelar" variant="secondary" onPress={cancelAvatar} /></View>
        <View style={{ flex: 2 }}><Button label={draft === null ? 'Confirmar remoção' : 'Confirmar'} icon="check" onPress={confirmAvatar} /></View>
      </>
    ) : undefined}>
      <View style={wide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' } : { gap: 16 }}>
        <View style={{ flex: wide ? 1 : undefined, minWidth: wide ? 340 : undefined, gap: wide ? 24 : 16, width: wide ? undefined : '100%' }}>{profile}{picker}</View>
        <View style={{ flex: wide ? 1.3 : undefined, minWidth: wide ? 400 : undefined, gap: wide ? 24 : 16, width: wide ? undefined : '100%' }}>
          {data}{security}{appearance}
          {!live && <T v="small" c="muted">Modo demonstração: dados fictícios e conta guardada só neste aparelho.</T>}
          <Button label="Sair da conta" variant="secondary" onPress={logout} />
        </View>
      </View>
    </Screen>
  );
}
