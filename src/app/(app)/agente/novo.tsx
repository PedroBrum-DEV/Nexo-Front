import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useApp } from '../../../lib/store';
import { useTheme } from '../../../lib/ThemeContext';
import { useLayout } from '../../../lib/layout';
import { DAYS } from '../../../lib/data';
import { TEMPLATES, fillTemplate, type Template } from '../../../lib/templates';
import areas from '../../../lib/areas.json';
import { leave } from '../../../lib/nav';
import { color } from '../../../lib/theme';
import Connect from '../../../components/Connect';
import { Button, Card, Check, Chip, ErrorText, haptic, Icon, Notice, T, Tap, TextField, type InputRef } from '../../../components/ui';
import { Screen } from '../../../components/Screen';

type Area = { label: string; description: string; needsSchedule: boolean; can: string[]; template: string };
type IconName = React.ComponentProps<typeof Icon>['name'];
const AREAS = areas as Record<string, Area>;
const ORDER = ['vendas', 'agendamento', 'suporte', 'leads', 'documentos', 'personalizado'];
const ICON: Record<string, IconName> = { vendas: 'tag', agendamento: 'calendar', suporte: 'life-buoy', leads: 'target', documentos: 'file-text', personalizado: 'sliders' };
const STEPS = ['O que ele faz', 'O que ele sabe', 'WhatsApp'];
const HOLE = /\[[^\]\n]{2,}\]/g;

// O que o cliente escreve e como o agente responde, por área: a prévia muda ao vivo.
const DEMO: Record<string, [string, (a: string, c: string) => string]> = {
  vendas: ['Oi! Quanto custa e como funciona?', (a, c) => `Oi! Eu sou ${a}, assistente de ${c}. Posso te explicar como funciona e passar os valores. O que você está procurando?`],
  agendamento: ['Queria marcar um horário na quinta.', (a, c) => `Claro! Sou ${a}, assistente de ${c}. Na quinta tenho 9h, 10h30 e 14h. Qual fica melhor?`],
  suporte: ['Meu pedido ainda não chegou.', (a, c) => `Sinto muito por isso! Sou ${a}, de ${c}. Me passa o número do pedido que eu confiro agora.`],
  leads: ['Vi o anúncio de vocês.', (a, c) => `Oi! Sou ${a}, de ${c}. Que bom ter você aqui! Para indicar a melhor opção, qual é o seu nome e o que você precisa?`],
  documentos: ['Preciso de uma proposta.', (a, c) => `Oi! Sou ${a}, de ${c}. Preparo a proposta agora: qual serviço você quer e para quantas pessoas?`],
  personalizado: ['Oi, tudo bem?', (a, c) => `Oi! Sou ${a}, assistente de ${c}. Como posso ajudar?`],
};

function Stepper({ label, value, min, max, by = 1, onChange, fmt }: { label: string; value: number; min: number; max: number; by?: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  const b = (sign: number, name: 'minus' | 'plus', l: string) => { const d = sign * by; return (
    <Tap accessibilityRole="button" accessibilityLabel={`${l} ${label.toLowerCase()}`} disabled={value + d < min || value + d > max} onPress={() => { haptic.select(); onChange(value + d); }} scale={0.9}
      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center', opacity: value + d < min || value + d > max ? 0.35 : 1 }}><Icon name={name} size={20} /></Tap>
  ); };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }} accessible={false}>
      <T v="label">{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{b(-1, 'minus', 'Diminuir')}<T v="label" num style={{ minWidth: 56, textAlign: 'center' }} accessibilityLiveRegion="polite">{fmt(value)}</T>{b(1, 'plus', 'Aumentar')}</View>
    </View>
  );
}

// A resposta do agente "digita" por um instante quando a área muda (só se o sistema permitir movimento).
function Preview({ name, company, area, hours }: { name: string; company: string; area: string; hours: string }) {
  useTheme();
  const reduced = useReducedMotion();
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (reduced || !area) { setTyping(false); return; }
    setTyping(true); const t = setTimeout(() => setTyping(false), 750); return () => clearTimeout(t);
  }, [area, reduced]);
  const agent = name.trim() || 'Sofia', comp = company.trim() || 'sua empresa';
  const [ask, say] = DEMO[area] || ['Olá!', (a: string, c: string) => `Olá! Sou ${a}, assistente de ${c}. Escolha uma área para ver como eu respondo.`];
  return (
    <View style={{ gap: 8 }} accessibilityLabel="Prévia da conversa">
      <T v="label" c="muted">Como o cliente vai ver</T>
      <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: color.line, backgroundColor: color.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: color.primary }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color.gold, alignItems: 'center', justifyContent: 'center' }}><T v="label" style={{ color: '#0A2A40' }}>{agent.slice(0, 1).toUpperCase()}</T></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="label" c="onPrimary" numberOfLines={1}>{agent}</T>
            <T v="caption" c="onPrimary" numberOfLines={1} style={{ opacity: 0.9 }}>{hours || `assistente de ${comp}`}</T>
          </View>
        </View>
        <View style={{ gap: 10, padding: 14, paddingBottom: 18, minHeight: 210, backgroundColor: color.subtle }} accessibilityLiveRegion="polite">
          <View style={{ alignSelf: 'flex-end', maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderBottomRightRadius: 4, backgroundColor: color.soft }}><T v="small" c="deep" style={{ fontWeight: '600' }}>{ask}</T></View>
          {typing ? (
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: color.bg, borderWidth: 1, borderColor: color.line, flexDirection: 'row', gap: 4 }} accessibilityLabel="Digitando">
              {[0, 1, 2].map((i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.muted, opacity: 0.35 + i * 0.25 }} />)}
            </View>
          ) : (
            <Animated.View key={area || 'none'} entering={FadeIn.duration(250)} style={{ alignSelf: 'flex-start', maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: color.bg, borderWidth: 1, borderColor: color.line }}>
              <T v="small" style={{ fontWeight: '600' }}>{say(agent, comp)}</T>
            </Animated.View>
          )}
        </View>
      </View>
      <T v="caption" c="muted">É só uma amostra. Depois de salvar, você testa com as suas instruções de verdade.</T>
    </View>
  );
}

export default function AgenteNovo() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { wide } = useLayout();
  const { createAgent, saveAgent, setAgentStatus, agents } = useApp();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: '', company: '', area: '', prompt: '', contact: '', slots: { days: [1, 2, 3, 4, 5], start: 9, end: 18, step: 60 } });
  const [agentId, setAgentId] = useState<string | null>(null);
  const [mode, setMode] = useState<'modelo' | 'segmento' | 'colar' | null>(null); // como a pessoa começou as instruções
  const [tpl, setTpl] = useState<Template | null>(null); // modelo de segmento escolhido (valores de exemplo: precisam de revisão)
  const [reviewed, setReviewed] = useState(false);
  const [sel, setSel] = useState({ start: 0, end: 0 });
  const [ignore, setIgnore] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const promptRef = useRef<InputRef>(null);
  const area = AREAS[f.area];
  const sch = !!area?.needsSchedule;
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const slot = (k: 'days' | 'start' | 'end' | 'step', v: number | number[]) => setF((x) => ({ ...x, slots: { ...x.slots, [k]: v } }));
  const agent = agents.find((a) => a.id === agentId);

  const text = f.prompt.trim();
  const holes = (f.prompt.match(HOLE) || []).length;
  // o que ainda falta em cada etapa, em palavras (aparece ao lado do botão)
  const missing = step === 1
    ? [!f.area && 'escolher o que o agente faz', f.name.trim().length < 2 && 'dar um nome ao agente', f.company.trim().length < 2 && 'informar a empresa']
    : step === 2
      ? [text.length < 40 && 'escrever as instruções', holes > 0 && `preencher ${holes} ${holes === 1 ? 'campo' : 'campos'} entre colchetes`, !!tpl && !reviewed && holes === 0 && text.length >= 40 && 'confirmar a revisão do modelo', sch && !f.slots.days.length && 'escolher ao menos um dia', sch && f.slots.start >= f.slots.end && 'ajustar o horário']
      : [];
  const todo = missing.filter(Boolean) as string[];
  const hours = sch && f.slots.days.length ? `${[...f.slots.days].sort().map((i) => DAYS[i]).join(', ')} · ${f.slots.start}h às ${f.slots.end}h` : '';

  const pickArea = (id: string) => { haptic.select(); set('area', id); };
  const focusPrompt = () => setTimeout(() => promptRef.current?.focus(), 60);
  const useAreaTemplate = () => { haptic.select(); setMode('modelo'); setTpl(null); set('prompt', area.template); focusPrompt(); };
  const useSegment = (t: Template) => {
    haptic.select(); setMode('segmento'); setTpl(t); setReviewed(false);
    setF((x) => ({ ...x, area: t.area, prompt: fillTemplate(t, x.company, x.name), slots: t.slots }));
    focusPrompt();
  };
  const restart = () => { haptic.select(); setMode(null); setTpl(null); setReviewed(false); set('prompt', ''); };
  const nextHole = () => {
    haptic.select();
    const re = new RegExp(HOLE.source, 'g'); let m: RegExpExecArray | null, first: RegExpExecArray | null = null, found: RegExpExecArray | null = null;
    while ((m = re.exec(f.prompt))) { first ??= m; if (m.index >= sel.end) { found = m; break; } }
    found ??= first; if (!found) return;
    const next = { start: found.index, end: found.index + found[0].length };
    promptRef.current?.focus(); setSel(next);
  };

  const next2 = async () => {
    if (!area) return;
    setBusy(true); setErr('');
    try {
      const body = { name: f.name.trim(), company: f.company.trim(), area: f.area, prompt: text, contact: f.contact, ...(sch ? { slots: f.slots } : {}) };
      if (agentId) await saveAgent(agentId, body); else setAgentId((await createAgent(body)).id);
      setStep(3);
    } catch (e) { haptic.error(); setErr((e as Error).message); }
    setBusy(false);
  };
  const finish = async (start: boolean) => {
    if (!agentId) return;
    setBusy(true); setErr('');
    try {
      await saveAgent(agentId, { ignoreNumbers: ignore.split(/\n|,/).map((x) => x.trim()).filter(Boolean) });
      if (start) { await setAgentStatus(agentId, 'active'); haptic.success(); }
      router.replace(start ? { pathname: '/agente/[id]', params: { id: agentId } } : '/agentes');
    } catch (e) { haptic.error(); setErr((e as Error).message); setBusy(false); }
  };

  const status = todo.length ? `Falta ${todo.join(' e ')}.` : step === 3 ? (agent?.connection === 'open' ? 'Tudo pronto para iniciar.' : 'Conecte o número para iniciar, ou faça isso depois.') : 'Tudo certo por aqui.';
  const footer = (
    <View style={{ flex: 1, gap: 10 }}>
      <T v="small" c="muted" style={{ fontWeight: '600' }} accessibilityLiveRegion="polite">{status}</T>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {step === 1 && <View style={{ flex: 1 }}><Button label="Continuar" disabled={todo.length > 0} onPress={() => setStep(2)} /></View>}
        {step === 2 && (<><View style={{ flex: 1 }}><Button label="Voltar" variant="secondary" onPress={() => setStep(1)} /></View><View style={{ flex: 2 }}><Button label={busy ? 'Salvando…' : 'Salvar e continuar'} disabled={todo.length > 0} loading={busy} onPress={next2} /></View></>)}
        {step === 3 && (<><View style={{ flex: 1 }}><Button label={agent?.connection === 'open' ? 'Deixar pausado' : 'Conectar depois'} variant="secondary" disabled={busy} onPress={() => finish(false)} /></View><View style={{ flex: 1 }}><Button label="Iniciar" disabled={agent?.connection !== 'open' || busy} onPress={() => finish(true)} /></View></>)}
      </View>
    </View>
  );

  const stepper = (
    <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="tablist">
      {STEPS.map((t, i) => {
        const n = i + 1, cur = step === n, done = step > n, can = done && step < 3;
        return (
          <Tap key={t} disabled={!can} onPress={() => { haptic.select(); setStep(n); }} accessibilityRole="tab" accessibilityState={{ selected: cur, disabled: !can && !cur }} accessibilityLabel={`Etapa ${n} de 3: ${t}${done ? ', concluída' : ''}`} scale={0.97}
            style={{ flexGrow: cur || wide ? 1 : 0, flexShrink: cur ? 1 : 0, flexBasis: cur || wide ? 0 : 'auto', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: cur ? color.primary : color.line, backgroundColor: cur ? color.soft : color.bg }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: cur ? color.primary : done ? color.success : 'transparent', borderWidth: cur || done ? 0 : 2, borderColor: color.line }}>
              {done ? <Icon name="check" size={16} c="onPrimary" /> : <T v="caption" c={cur ? 'onPrimary' : 'muted'} style={{ fontWeight: '800' }}>{n}</T>}
            </View>
            {(cur || wide) && <T v="label" c={cur ? 'ink' : 'muted'} numberOfLines={1} style={{ flexShrink: 1 }}>{t}</T>}
          </Tap>
        );
      })}
    </View>
  );

  const areaStep = (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <T v="title" accessibilityRole="header">O que o agente vai fazer?</T>
        <T c="muted">Escolha a tarefa principal. Dá para mudar depois.</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
        {ORDER.map((id) => {
          const on = f.area === id, a = AREAS[id]!;
          return (
            <Tap key={id} accessibilityRole="radio" accessibilityState={{ checked: on }} {...({ 'aria-checked': on } as object)} accessibilityLabel={`${a.label}. ${a.description}`} onPress={() => pickArea(id)} scale={0.985}
              style={{ flexBasis: wide ? '48%' : '100%', flexGrow: 1, flexDirection: 'row', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: on ? color.primary : color.line, backgroundColor: on ? color.soft : color.bg }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? color.primary : color.subtle }}><Icon name={ICON[id]!} size={22} c={on ? 'onPrimary' : 'muted'} /></View>
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <T v="label" style={{ fontSize: 16 }}>{a.label}</T>
                <T v="small" c={on ? 'deep' : 'muted'}>{a.description}</T>
              </View>
              {on && <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} c="onPrimary" /></View>}
            </Tap>
          );
        })}
      </View>
      {area && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityLabel="O que este agente faz">
          {area.can.map((c) => <View key={c} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: color.subtle }}><T v="caption" c="muted" style={{ fontWeight: '700' }}>{c}</T></View>)}
        </View>
      )}
      <View style={{ gap: 12, marginTop: 8 }}>
        <T v="title" accessibilityRole="header">Como ele se apresenta?</T>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
          <View style={{ flex: 1 }}><TextField label="Nome do agente" value={f.name} onChangeText={(v) => set('name', v)} maxLength={60} placeholder="Ex.: Sofia" autoCapitalize="words" /></View>
          <View style={{ flex: 1 }}><TextField label="Nome da empresa" value={f.company} onChangeText={(v) => set('company', v)} maxLength={80} placeholder="Ex.: Clínica Vida Plena" autoCapitalize="words" /></View>
        </View>
      </View>
    </View>
  );

  const optCard = (title: string, sub: string, onPress: () => void, main?: boolean) => (
    <Tap accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} onPress={onPress} scale={0.985}
      style={{ padding: 16, gap: 4, borderRadius: 16, borderWidth: 1.5, borderColor: main ? color.primary : color.line, backgroundColor: main ? color.soft : color.bg }}>
      <T v="label" style={{ fontSize: 16 }}>{title}</T><T v="small" c="muted">{sub}</T>
    </Tap>
  );

  const promptStep = area && (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <T v="title" accessibilityRole="header">O que o agente precisa saber?</T>
        <T c="muted">Quanto mais ele souber do seu negócio, melhores as respostas. Escreva como se explicasse para um funcionário novo.</T>
      </View>

      {!text && !mode ? (
        <View style={{ gap: 10 }}>
          {optCard(`Começar pelo modelo de ${area.label.toLowerCase()}`, 'Já vem com a estrutura pronta. Você só troca o que está entre colchetes.', useAreaTemplate, true)}
          {sch && optCard('Modelo pronto do seu segmento', 'Clínica, salão, imobiliária, advocacia, academia ou restaurante, com horários.', () => setMode('segmento'))}
          {optCard('Colar as minhas instruções', 'Use este caminho se você já tem o texto pronto.', () => { setMode('colar'); focusPrompt(); })}
        </View>
      ) : mode === 'segmento' && !tpl ? (
        <View style={{ gap: 10 }}>
          <T v="label">Qual é o seu segmento?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
            {TEMPLATES.map((t) => (
              <Tap key={t.id} accessibilityRole="radio" accessibilityState={{ checked: false }} {...({ 'aria-checked': false } as object)} accessibilityLabel={`Modelo ${t.label}. ${t.tagline}`} onPress={() => useSegment(t)} scale={0.97}
                style={{ flexBasis: '47%', flexGrow: 1, minHeight: 84, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.bg, gap: 6 }}>
                <Icon name={t.icon} size={20} c="muted" />
                <View><T v="label" numberOfLines={2}>{t.label}</T><T v="caption" c="muted" numberOfLines={2}>{t.tagline}</T></View>
              </Tap>
            ))}
          </View>
          <Button label="Voltar" variant="ghost" full={false} small onPress={() => setMode(null)} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {tpl && (
            <Notice title={`Modelo: ${tpl.label}`}>
              <T v="small" c="goldDeep">Preços, horários, convênios e regras deste modelo são exemplos. Troque pelos da sua empresa antes de continuar.</T>
              <View style={{ marginTop: 6 }}><Check checked={reviewed} onChange={setReviewed} label="Revisei e ajustei os valores do modelo" /></View>
            </Notice>
          )}
          <TextField ref={promptRef} label="Instruções do agente" value={f.prompt} onChangeText={(v) => set('prompt', v)} multiline selection={sel} onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
            style={{ minHeight: 280, maxHeight: 440 }} placeholder="Cole aqui as instruções do serviço…" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <T v="small" c={text.length < 40 ? 'danger' : 'muted'} style={{ fontWeight: '600' }}>{text.length} caracteres{text.length < 300 ? ' · quanto mais detalhe, melhor' : ''}</T>
            {holes > 0 ? (
              <Tap accessibilityRole="button" accessibilityLabel={`${holes} ${holes === 1 ? 'campo' : 'campos'} para preencher. Ir ao próximo`} onPress={nextHole} scale={0.96}
                style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: color.gold, backgroundColor: color.goldSoft, justifyContent: 'center' }}>
                <T v="label" c="goldDeep">{holes} {holes === 1 ? 'campo' : 'campos'} para preencher · ir ao próximo</T>
              </Tap>
            ) : text.length >= 40 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="check" size={16} c="success" /><T v="small" c="success" style={{ fontWeight: '700' }}>Sem campos pendentes</T></View> : null}
          </View>
          {!!text && <Button label="Começar de novo" variant="ghost" full={false} small onPress={restart} />}
        </View>
      )}

      {sch && (
        <View style={{ gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: color.line, backgroundColor: color.bg }}>
          <T v="label" style={{ fontSize: 16 }}>Quando ele pode marcar horários?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityLabel="Dias de atendimento">
            {DAYS.map((n, i) => <Chip key={n} label={n} on={f.slots.days.includes(i)} onPress={() => slot('days', f.slots.days.includes(i) ? f.slots.days.filter((x) => x !== i) : [...f.slots.days, i])} />)}
          </View>
          <Stepper label="Começa às" value={f.slots.start} min={0} max={23} onChange={(v) => slot('start', v)} fmt={(v) => `${v}h`} />
          <Stepper label="Termina às" value={f.slots.end} min={1} max={24} onChange={(v) => slot('end', v)} fmt={(v) => `${v}h`} />
          <Stepper label="Cada atendimento dura" value={f.slots.step} min={15} max={120} by={15} onChange={(v) => slot('step', v)} fmt={(v) => `${v} min`} />
          {f.slots.start >= f.slots.end && <T v="small" c="danger" role="alert">O início precisa ser antes do fim.</T>}
        </View>
      )}
      <TextField label="Contato oficial da empresa (opcional)" value={f.contact} onChangeText={(v) => set('contact', v)} maxLength={200} placeholder="Telefone ou e-mail para o que o agente não resolve" autoCapitalize="none" />
      <ErrorText>{err}</ErrorText>
    </View>
  );

  const waStep = agent && (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <T v="title" accessibilityRole="header">Conecte o WhatsApp</T>
        <T c="muted">O agente <T v="label">{agent.name}</T> foi salvo. Falta ligar o número que ele vai usar.</T>
      </View>
      <Connect agent={agent} />
      <TextField label="Contatos que o agente não deve atender (opcional)" value={ignore} onChangeText={setIgnore} multiline style={{ minHeight: 80 }} placeholder="Um número por linha, ex.: 5511988887777" keyboardType="number-pad" hint="Um número por linha." />
      <ErrorText>{err}</ErrorText>
    </View>
  );

  const preview = <Preview name={f.name} company={f.company} area={f.area} hours={hours} />;
  return (
    <Screen back onBack={leave} width={wide ? 1040 : 760} title="Criar agente" footer={footer}>
      {stepper}
      {step === 3 ? <Card style={{ gap: 16 }}>{waStep}</Card> : wide ? (
        <View style={{ flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}><Card>{step === 1 ? areaStep : promptStep}</Card></View>
          <View style={{ width: 320 }}>{preview}</View>
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <Card>{step === 1 ? areaStep : promptStep}</Card>
          {preview}
        </View>
      )}
    </Screen>
  );
}
