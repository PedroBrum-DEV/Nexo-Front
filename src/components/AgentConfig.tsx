import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { live, remote } from '../lib/api';
import { useApp } from '../lib/store';
import { useLayout } from '../lib/layout';
import type { Agent } from '../lib/data';
import { fmtPhone, norm } from '../lib/format';
import { color } from '../lib/theme';
import Connect from './Connect';
import VersionHistory from './VersionHistory';
import { Button, Card, Check, Divider, Dot, ErrorText, SectionTitle, T, TextField } from './ui';
import { useTheme } from '../lib/ThemeContext';

const STOP = new Set(['voces', 'tem', 'qual', 'quais', 'como', 'para', 'com', 'que', 'uma', 'aceitam', 'quero', 'gostaria', 'queria']);
// Demonstração: responde com a linha das instruções que mais combina; se nada combina, diz que não sabe (como a IA real).
function demoReply(msg: string, prompt: string, contact?: string) {
  const words = norm(msg).split(/\W+/).filter((w) => w.length > 3 && !STOP.has(w));
  let best: string | null = null, score = 0;
  for (const line of prompt.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 8)) {
    const n = norm(line); const sc = words.filter((w) => n.includes(w.slice(0, Math.max(4, w.length - 2)))).length;
    if (sc > score) { score = sc; best = line; }
  }
  return best ? best.replace(/^[^:]{1,40}:\s*/, '') : `Essa eu não sei te dizer por aqui.${contact ? ` O contato é ${contact}.` : ''}`;
}

export default function AgentConfig({ agent: a }: { agent: Agent }) {
  useTheme();
  const { requests, focus, history, saveAgent, addToPrompt, disconnectAgent, removeAgent, markTested, say } = useApp();
  const [showHist, setShowHist] = useState(false);
  const [text, setText] = useState(a.prompt);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [chat, setChat] = useState<{ w: 'c' | 's'; text: string }[]>([]);
  const [typing, setTyping] = useState(false);
  const [msg, setMsg] = useState('');
  const { wide } = useLayout();
  const m0 = a.settings.meetings ?? { enabled: true, link: '' };
  const [meetOn, setMeetOn] = useState(m0.enabled);
  const [meetLink, setMeetLink] = useState(m0.link);
  const [savingMeet, setSavingMeet] = useState(false);
  useEffect(() => { setMeetOn(m0.enabled); setMeetLink(m0.link); }, [m0.enabled, m0.link]);
  const meetDirty = meetOn !== m0.enabled || meetLink.trim() !== m0.link;
  const conv = useRef(`painel-${Date.now()}`);
  useEffect(() => { setText(a.prompt); }, [a.prompt]);

  const open = a.connection === 'open';
  const dirty = text.trim() !== a.prompt.trim();
  const gaps = requests.filter((r) => r.kind === 'pergunta' && r.status === 'open').sort((x, y) => (x.id === focus ? -1 : y.id === focus ? 1 : 0));
  const run = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { say((e as Error).message); } };

  const save = () => run(async () => { setSaving(true); await saveAgent(a.id, { prompt: text.trim() }); say('Instruções salvas. O agente já usa a nova versão.'); setSaving(false); });
  const send = async () => {
    const t = msg.trim();
    if (!t || typing) return;
    setMsg(''); setChat((c) => [...c, { w: 'c', text: t }]); setTyping(true); markTested(a.id); // conta no passo "Teste o agente"
    try {
      const parts: string[] = live ? ((await remote.chat(a.id, conv.current, t)).parts || []) : [demoReply(t, a.prompt, a.settings.contact)];
      if (!live) await new Promise((r) => setTimeout(r, 900));
      setChat((c) => [...c, ...parts.map((p) => ({ w: 's' as const, text: p }))]);
    } catch (er) { setChat((c) => [...c, { w: 's', text: `Erro: ${(er as Error).message}` }]); }
    setTyping(false);
  };

  const secWhats = (
      <View style={{ gap: 12 }}>
        <SectionTitle>WhatsApp</SectionTitle>
        {open ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}><Dot on /><T v="label" numberOfLines={1}>Conectado{a.phone ? ` · ${fmtPhone(a.phone)}` : ''}</T></View>
            <Button label="Desconectar" variant="secondary" small full={false} onPress={() => run(() => disconnectAgent(a.id))} />
          </View>
        ) : <Connect key={a.connection} agent={a} onOpen={() => say('WhatsApp conectado. Toque em "Iniciar atendimento" quando quiser começar.')} />}
      </View>
  );
  const secPrompt = (
      <View style={{ gap: 12 }}>
        <SectionTitle>Instruções</SectionTitle>
        <TextField label="Instruções do agente" value={text} onChangeText={setText} multiline style={{ minHeight: 220 }} />
        <Button label={saving ? 'Salvando…' : dirty ? 'Salvar alterações' : 'Salvo'} disabled={!dirty || text.trim().length < 40} loading={saving} onPress={save} />
        <Button label={`${showHist ? 'Ocultar' : 'Ver'} histórico de versões (${history[a.id]?.length ?? 0})`} icon="clock" variant="ghost" small full={false} onPress={() => setShowHist((v) => !v)} />
        {showHist && <VersionHistory agent={a} />}
      </View>
  );
  const secMeet = a.settings.slots ? (
      <View style={{ gap: 12 }}>
        <SectionTitle>Reuniões por vídeo</SectionTitle>
        <T v="small" c="muted">Quando o cliente pedir uma reunião (por exemplo, com o time de desenvolvimento), {a.name} escolhe um horário livre, marca, manda o link da chamada pelo WhatsApp e a reunião aparece na Agenda.</T>
        <Check checked={meetOn} onChange={setMeetOn} label={`Deixar ${a.name} marcar reuniões`} />
        {meetOn && <TextField label="Sala fixa (opcional)" value={meetLink} onChangeText={setMeetLink} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://meet.google.com/…" hint="Usada quando o servidor não está ligado ao Google Agenda. Com ele, cada reunião ganha um link novo do Meet." />}
        <Button label={savingMeet ? 'Salvando…' : meetDirty ? 'Salvar reuniões' : 'Salvo'} disabled={!meetDirty} loading={savingMeet} onPress={() => run(async () => { setSavingMeet(true); try { await saveAgent(a.id, { meetings: { enabled: meetOn, link: meetLink.trim() } }); say('Configuração de reuniões salva.'); } finally { setSavingMeet(false); } })} />
      </View>
  ) : null;
  const secGaps = (
        <View style={{ gap: 16 }}>
          <SectionTitle>Perguntas sem resposta</SectionTitle>
          {gaps.map((r) => (
            <View key={r.id} style={{ gap: 8, padding: 16, borderRadius: 12, backgroundColor: r.id === focus ? color.goldSoft : color.subtle }}>
              <T v="label">{r.title}</T>
              <T v="small" c="muted">Perguntaram {r.n} {r.n === 1 ? 'vez' : 'vezes'}: “{r.text}”</T>
              <TextField label={`Resposta para ${r.title}`} value={draft[r.id] || ''} onChangeText={(v) => setDraft({ ...draft, [r.id]: v })} multiline style={{ minHeight: 90 }} autoFocus={r.id === focus} placeholder="O agente passa a usar esta resposta na próxima conversa…" />
              <Button label="Adicionar às instruções" disabled={!(draft[r.id] || '').trim()} onPress={() => run(() => addToPrompt(a.id, r.id, r.title, (draft[r.id] || '').trim()))} />
            </View>
          ))}
        </View>
  );
  const secTest = (
      <View style={{ gap: 12 }}>
        <SectionTitle>Testar {a.name}</SectionTitle>
        <T v="small" c="muted">{live ? 'Conversa real com a IA, usando as instruções salvas.' : 'Respostas simuladas nesta demonstração.'}</T>
        <View style={{ gap: 8, minHeight: 60 }} accessibilityLiveRegion="polite">
          {!chat.length && <T c="muted">Escreva como se fosse um cliente.</T>}
          {chat.map((m, i) => (
            <View key={i} style={{ alignSelf: m.w === 'c' ? 'flex-end' : 'flex-start', maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: m.w === 'c' ? color.primary : color.subtle }}>
              <T c={m.w === 'c' ? 'onPrimary' : 'ink'}>{m.text}</T>
            </View>
          ))}
          {typing && <T v="small" c="muted">{a.name} está digitando…</T>}
        </View>
        <TextField label="Mensagem de teste" value={msg} onChangeText={setMsg} placeholder="Escreva como cliente…" returnKeyType="send" onSubmitEditing={send} blurOnSubmit={false} />
        <Button label="Enviar" variant="secondary" disabled={!msg.trim() || typing} onPress={send} />
      </View>
  );
  const secRemove = (
      <View style={{ gap: 12 }}>
        {!wide && <Divider />}
        <SectionTitle>Remover agente</SectionTitle>
        <T v="small" c="muted">Apaga o agente e desconecta o WhatsApp. As conversas já feitas não voltam.</T>
        {confirm ? (
          <View style={{ gap: 8 }}>
            <ErrorText>Tem certeza? Esta ação não pode ser desfeita.</ErrorText>
            <Button label="Confirmar remoção" variant="danger" onPress={() => run(async () => { await removeAgent(a.id); router.replace('/agentes'); })} />
            <Button label="Cancelar" variant="ghost" onPress={() => setConfirm(false)} />
          </View>
        ) : <Button label="Remover agente" variant="secondary" onPress={() => setConfirm(true)} />}
      </View>
  );
  if (wide) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <View style={{ flex: 3, minWidth: 440, gap: 24 }}>
          <Card style={{ gap: 12 }}>{secWhats}</Card>
          <Card>{secPrompt}</Card>
          {secMeet && <Card>{secMeet}</Card>}
          {gaps.length > 0 && <Card>{secGaps}</Card>}
        </View>
        <View style={{ flex: 2, minWidth: 340, gap: 24 }}>
          <Card>{secTest}</Card>
          <Card>{secRemove}</Card>
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 12 }}>{secWhats}</Card>
      <Card>{secPrompt}</Card>
      {secMeet && <Card>{secMeet}</Card>}
      {gaps.length > 0 && <Card>{secGaps}</Card>}
      <Card>{secTest}</Card>
      <Card>{secRemove}</Card>
    </View>
  );
}
