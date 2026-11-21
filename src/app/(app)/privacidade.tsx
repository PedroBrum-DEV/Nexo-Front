import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../lib/auth';
import { live, remote } from '../../lib/api';
import { saveFile, stamp } from '../../lib/export';
import { leave } from '../../lib/nav';
import { useApp } from '../../lib/store';
import { useTheme } from '../../lib/ThemeContext';
import { Screen } from '../../components/Screen';
import { Button, Card, Divider, ErrorText, haptic, Icon, Notice, PasswordField, Reveal, SectionTitle, T, TextField } from '../../components/ui';

const ITEMS: [string, string][] = [['user', 'Seus dados de conta: nome, CPF ou CNPJ e e-mail'], ['cpu', 'Seus agentes, as instruções de cada um e o histórico de versões'], ['list', 'Os registros que esperam decisão e os que você resolveu'], ['image', 'A foto de perfil ou o avatar e as preferências (como o tema)']];

export default function Privacidade() {
  const { mode } = useTheme(); // também faz a página se redesenhar ao trocar o tema
  const { user, avatar, listSessions, deleteAccount } = useAuth();
  const { ws, sample, resetWorkspace, say } = useApp();
  const [busy, setBusy] = useState<'export' | 'delete' | 'sample' | null>(null);
  const [err, setErr] = useState('');
  const [armed, setArmed] = useState(false); // formulário de exclusão aberto
  const [pw, setPw] = useState('');
  const [word, setWord] = useState('');
  const [confirmSample, setConfirmSample] = useState(false);

  const download = async () => {
    setBusy('export'); setErr('');
    try {
      const data = {
        geradoEm: new Date().toISOString(),
        sobre: 'Cópia dos dados da sua conta no Nexo. Não inclui senhas.',
        conta: user,
        fotoOuAvatar: avatar,
        aparencia: mode,
        agentes: ws.agents,
        historicoDeInstrucoes: ws.history,
        registros: ws.requests,
        primeirosPassos: { agentesTestados: ws.tested, dispensado: ws.onboardingDismissed },
        sessoes: await listSessions().catch(() => []),
        ...(live ? { servidor: await remote.exportData() } : {}),
      };
      await saveFile(`nexo-meus-dados-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
      haptic.success(); say('Arquivo com os seus dados gerado.');
    } catch (e) { haptic.error(); setErr((e as Error).message || 'Não consegui gerar o arquivo.'); }
    setBusy(null);
  };

  const canDelete = pw.length > 0 && word.trim().toUpperCase() === 'EXCLUIR';
  const del = async () => {
    setBusy('delete'); setErr('');
    try { await deleteAccount(pw); haptic.success(); } catch (e) { haptic.error(); setErr((e as Error).message); setBusy(null); }
  };

  return (
    <Screen back onBack={leave} title="Privacidade e dados" width={760}>
      <T c="muted" style={{ marginTop: -4 }}>Você decide o que fica guardado. Aqui dá para levar uma cópia dos seus dados ou apagar tudo.</T>
      <ErrorText>{err}</ErrorText>

      <Reveal i={0}>
        <Card style={{ gap: 14 }}>
          <SectionTitle>O que guardamos</SectionTitle>
          {ITEMS.map(([ic, text]) => <View key={ic} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}><Icon name={ic as 'user'} size={18} c="muted" /><T style={{ flex: 1 }}>{text}</T></View>)}
          <T v="small" c="muted">{live ? 'Parte destes dados fica nos nossos servidores e parte neste aparelho.' : 'Modo demonstração: tudo isso fica só neste aparelho, nada vai para a internet.'}</T>
        </Card>
      </Reveal>

      <Reveal i={1}>
        <Card style={{ gap: 12 }}>
          <SectionTitle>Baixar meus dados</SectionTitle>
          <T c="muted">Gera um arquivo (JSON) com uma cópia de tudo o que está ligado à sua conta. As senhas nunca entram no arquivo.</T>
          <Button label={busy === 'export' ? 'Gerando…' : 'Baixar meus dados'} icon="download" variant="secondary" full={false} loading={busy === 'export'} onPress={download} />
        </Card>
      </Reveal>

      {sample && !live && (
        <Reveal i={2}>
          <Card style={{ gap: 12 }}>
            <SectionTitle>Dados de exemplo</SectionTitle>
            <T c="muted">Remove os dados de exemplo e também qualquer agente criado neste aparelho, e volta ao começo.</T>
            {confirmSample
              ? <View style={{ gap: 8 }}><Button label="Sim, apagar" variant="danger" loading={busy === 'sample'} onPress={() => { resetWorkspace(); setConfirmSample(false); say('Dados apagados.'); }} /><Button label="Cancelar" variant="ghost" onPress={() => setConfirmSample(false)} /></View>
              : <Button label="Apagar dados de exemplo" variant="secondary" full={false} onPress={() => setConfirmSample(true)} />}
          </Card>
        </Reveal>
      )}

      <Reveal i={3}>
        <Card style={{ gap: 14 }}>
          <SectionTitle>Excluir minha conta</SectionTitle>
          <T c="muted">Apaga a conta e tudo o que ela guarda: agentes, instruções, histórico, registros e a foto. Não dá para desfazer.</T>
          {!armed ? <Button label="Excluir minha conta…" variant="secondary" full={false} onPress={() => { haptic.select(); setArmed(true); }} /> : (
            <View style={{ gap: 16 }}>
              <Divider />
              <Notice title="Esta ação é definitiva"><T v="small" c="goldDeep">Se você só quer sair, use “Sair da conta” na tela Conta. Para continuar, confirme com a sua senha e escreva EXCLUIR.</T></Notice>
              <PasswordField label="Sua senha" value={pw} onChangeText={setPw} autoComplete="current-password" textContentType="password" />
              <TextField label="Escreva EXCLUIR para confirmar" value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} placeholder="EXCLUIR" />
              <Button label={busy === 'delete' ? 'Excluindo…' : 'Excluir definitivamente'} variant="danger" disabled={!canDelete} loading={busy === 'delete'} onPress={del} />
              <Button label="Cancelar" variant="ghost" onPress={() => { setArmed(false); setPw(''); setWord(''); setErr(''); }} />
            </View>
          )}
        </Card>
      </Reveal>
    </Screen>
  );
}
