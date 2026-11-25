import { useCallback, useRef, useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { live, remote } from '../../../lib/api';
import { useApp } from '../../../lib/store';
import { useTheme } from '../../../lib/ThemeContext';
import { useLayout } from '../../../lib/layout';
import { copyText } from '../../../lib/clipboard';
import { fmtPhone } from '../../../lib/format';
import { color } from '../../../lib/theme';
import {
  ALL_NEEDS, FILTERS, NEED_LABEL, NEG_LABEL, OFFER_LABEL, STATUS_LABEL, canContact, canPreview, contactLine, eta, hasEmail, hasWhatsapp, matches, searchError, toggle, when,
  type Channel, type Company, type Filter, type Need, type NegItem, type RadarOverview,
} from '../../../lib/radar';
import { Button, Card, Check, Chip, Chips, Divider, Empty, ErrorState, Notice, Pill, Reveal, SectionTitle, Segmented, Skeleton, T, TextField } from '../../../components/ui';
import { Screen } from '../../../components/Screen';

const PAGE = 30;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexGrow: 1, flexBasis: 110, backgroundColor: color.subtle, borderRadius: 12, padding: 12, gap: 2 }}>
      <T v="title" num>{value}</T>
      <T v="caption" c="muted">{label}</T>
    </View>
  );
}

function Negotiation({ items, activeId }: { items: NegItem[]; activeId: string | null }) {
  if (!items.length) return <T c="muted">Nenhuma negociação em andamento.</T>;
  return (
    <View style={{ gap: 10 }}>
      {items.map((it) => {
        const [label, tone] = NEG_LABEL[it.state as Exclude<NegItem['state'], ''>] ?? [it.state, 'mute' as const];
        return (
          <View key={it.id} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Pill tone={tone}>{label}</Pill>
              <T v="label">{it.company}</T>
              {it.id === activeId ? <T v="caption" c="success">vez dela</T> : null}
            </View>
            <T v="small" c="muted">
              {[
                it.nextReplyAt ? `responde ${eta(it.nextReplyAt)}` : '',
                it.stage ? `etapa: ${it.stage}` : '',
                it.state === 'pausada' ? (it.resumes ? 'já foi retomada' : 'será retomada com o contexto') : '',
              ].filter(Boolean).join(' · ') || 'aguardando'}
            </T>
          </View>
        );
      })}
    </View>
  );
}

type CardProps = {
  c: Company; i: number; open: boolean; busy: boolean;
  onToggle: () => void; onContact: (ch: Channel) => void; onPreview: () => void; onSkip: () => void; onCopy: (t: string) => void;
};

function CompanyCard({ c, i, open, busy, onToggle, onContact, onPreview, onSkip, onCopy }: CardProps) {
  const [statusLabel, tone] = STATUS_LABEL[c.status] ?? [c.status, 'mute' as const];
  const neg = c.negState ? NEG_LABEL[c.negState] : null;
  const where = [c.hasSite ? c.domain : 'Sem site próprio', c.address].filter(Boolean).join(' · ');
  return (
    <Reveal i={Math.min(i, 8)}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <T v="title" style={{ fontSize: 17, flexShrink: 1 }}>{c.company}</T>
          <Pill tone={tone}>{statusLabel}</Pill>
          {neg ? <Pill tone={neg[1]}>{neg[0]}</Pill> : null}
        </View>
        <T v="small" c="muted">{where}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {c.needs.length
            ? c.needs.map((n) => <Pill key={n} tone="ia">{NEED_LABEL[n] ?? n}</Pill>)
            : <Pill tone="mute">Nenhuma necessidade</Pill>}
          {c.offerType ? <T v="small" c="muted">Oferta: {OFFER_LABEL[c.offerType] ?? c.offerType}</T> : null}
        </View>
        <T v="small" c="muted">{contactLine(c, fmtPhone)} · nota {c.score}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label={open ? 'Ocultar detalhes' : 'Detalhes'} variant="secondary" small full={false} onPress={onToggle} />
          {canContact(c) && hasWhatsapp(c) ? <Button label="Contatar no WhatsApp" icon="message-circle" small full={false} disabled={busy} onPress={() => onContact('whatsapp')} hint="Envia agora a primeira mensagem pelo WhatsApp do agente" /> : null}
          {canContact(c) && hasEmail(c) ? <Button label="Contatar por e-mail" icon="mail" small full={false} disabled={busy} onPress={() => onContact('email')} hint="Envia agora a primeira mensagem por e-mail" /> : null}
          {canPreview(c) ? <Button label={c.demoUrl ? 'Atualizar esboço' : 'Gerar esboço'} icon="layout" variant="secondary" small full={false} disabled={busy} onPress={onPreview} hint="Cria uma prévia personalizada para esta empresa" /> : null}
          {canContact(c) ? <Button label="Descartar" variant="secondary" small full={false} disabled={busy} onPress={onSkip} /> : null}
        </View>
        {open ? (
          <View style={{ gap: 10 }}>
            <Divider />
            <T><T v="label">O que ela precisa: </T>{c.needNote || 'Nenhuma necessidade identificada.'}</T>
            {c.reason ? <T v="small" c="muted">Análise: {c.reason}</T> : null}
            {c.siteSignals ? <T v="small" c="muted">Sinais do site: {c.siteSignals}</T> : null}
            {c.profile || c.objection || c.stage ? <T v="small" c="muted">{[c.profile && `Perfil: ${c.profile}`, c.objection && `Objeção: ${c.objection}`, c.stage && `Etapa: ${c.stage}`].filter(Boolean).join(' · ')}</T> : null}
            {c.figures ? <T v="small" c="muted">Números dele: {c.figures}</T> : null}
            {c.logoUrl || c.photos.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {c.logoUrl ? <Image source={{ uri: c.logoUrl }} accessibilityLabel={`Logotipo de ${c.company}`} resizeMode="contain" style={{ width: 90, height: 44 }} /> : null}
                {c.photos.slice(0, 3).map((u) => <Image key={u} source={{ uri: u }} accessibilityLabel={`Foto de ${c.company}`} style={{ width: 84, height: 62, borderRadius: 8 }} />)}
              </View>
            ) : null}
            {c.message ? <View style={{ gap: 4 }}><T v="label">Primeira mensagem</T><View style={{ backgroundColor: color.subtle, borderRadius: 10, padding: 12 }}><T selectable>{c.message}</T></View></View> : null}
            {c.note ? <T v="small" c="danger">{c.note}</T> : null}
            {c.demoUrl ? (
              <View style={{ gap: 8 }}>
                <T v="small" c="muted" selectable>Esboço: {c.demoUrl}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button label="Abrir esboço" icon="external-link" small full={false} onPress={() => Linking.openURL(c.demoUrl!)} />
                  <Button label="Copiar link" icon="copy" variant="secondary" small full={false} onPress={() => onCopy(c.demoUrl!)} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Reveal>
  );
}

export default function Radar() {
  useTheme();
  const { wide } = useLayout();
  const { say } = useApp();
  const [data, setData] = useState<RadarOverview | null>(null);
  const [error, setError] = useState('');
  const hydrated = useRef(false);
  // formulário de pesquisa
  const [location, setLocation] = useState('');
  const [segment, setSegment] = useState('');
  const [problems, setProblems] = useState<Need[]>(ALL_NEEDS);
  const [searching, setSearching] = useState(false);
  const [formError, setFormError] = useState('');
  // automático
  const [auto, setAuto] = useState(false);
  const [autoContact, setAutoContact] = useState(false);
  const [firstContact, setFirstContact] = useState<Channel>('whatsapp');
  const [offer, setOffer] = useState('');
  const [terms, setTerms] = useState('');
  const [saving, setSaving] = useState(false);
  // lista
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!live) return;
    remote.radar()
      .then((d) => {
        setData(d); setError('');
        if (!hydrated.current) {
          hydrated.current = true;
          const c = d.config;
          setLocation(c.location || ''); setProblems(c.problems.length ? c.problems : ALL_NEEDS); setAuto(c.auto); setAutoContact(c.autoContact);
          setFirstContact(c.firstContact); setOffer(c.offer || ''); setTerms(c.terms || '');
        }
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  // atualiza a cada 5 s enquanto a tela está aberta (a busca e as negociações andam sozinhas no servidor)
  useFocusEffect(useCallback(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]));

  const running = !!data?.status.running;
  const search = () => {
    const err = searchError(location, problems);
    setFormError(err);
    if (err) return;
    setSearching(true);
    remote.radarSearch({ location: location.trim(), problems, ...(segment.trim() ? { segment: segment.trim() } : {}) })
      .then(() => { say('Pesquisa iniciada. As empresas aparecem aqui em instantes.'); load(); })
      .catch((e: Error) => setFormError(e.message))
      .finally(() => setSearching(false));
  };
  const save = () => {
    setSaving(true);
    remote.radarConfig({ location: location.trim(), problems, auto, autoContact, firstContact, offer, terms })
      .then(() => { say('Configuração do Radar salva.'); load(); })
      .catch((e: Error) => say(`Não consegui salvar: ${e.message}`))
      .finally(() => setSaving(false));
  };
  const act = (c: Company, run: () => Promise<unknown>, ok: string) => {
    setBusyId(c.id);
    run().then(() => { say(ok); load(); }).catch((e: Error) => say(e.message)).finally(() => setBusyId(null));
  };
  const copy = async (t: string) => { if (await copyText(t)) say('Link copiado.'); };

  const list = (data?.companies ?? []).filter((c) => matches(c, filter));
  const shown = list.slice(0, limit);
  const cfg = data?.config;
  const wa = data?.whatsapp;
  let n = 0;

  const searchCard = (
    <Card style={{ gap: 14, flex: wide ? 1 : undefined }}>
      <SectionTitle>Pesquisar empresas</SectionTitle>
      <TextField label="Localização" value={location} onChangeText={setLocation} placeholder="Ex.: Campinas, SP" autoCapitalize="words" />
      <TextField label="Tipo de negócio (opcional)" value={segment} onChangeText={setSegment} placeholder="Ex.: barbearia" hint="Em branco, o Radar alterna entre vários tipos de negócio." />
      <View style={{ gap: 4 }}>
        <T v="label">Problema que os nossos serviços resolvem</T>
        {(data?.problemTypes ?? ALL_NEEDS.map((id) => ({ id, label: NEED_LABEL[id] }))).map((p) => (
          <Check key={p.id} checked={problems.includes(p.id)} onChange={() => setProblems((l) => toggle(l, p.id))} label={p.label} />
        ))}
      </View>
      {formError ? <T v="small" c="danger" role="alert">{formError}</T> : null}
      <Button label={running ? 'Pesquisando…' : 'Pesquisar'} icon="search" loading={searching || running} disabled={searching || running || !data?.status.searchOn} onPress={search} hint="Procura empresas e identifica o que cada uma precisa" />
      {running ? <T v="small" c="muted" accessibilityLiveRegion="polite">Buscando e analisando empresas…</T> : null}
    </Card>
  );

  const autoCard = (
    <Card style={{ gap: 14, flex: wide ? 1 : undefined }}>
      <SectionTitle>Automático</SectionTitle>
      <Check checked={auto} onChange={setAuto} label="Buscar sozinho a cada 4 horas (até 10 empresas por busca)" />
      <Check checked={autoContact} onChange={setAutoContact} label="Fazer o primeiro contato sozinho (dia útil, 9h às 18h, com intervalo entre envios)" />
      <View style={{ gap: 6 }}>
        <T v="label">Primeiro contato por</T>
        <Segmented value={firstContact} onChange={setFirstContact} options={[['whatsapp', 'WhatsApp, senão e-mail'], ['email', 'Só e-mail']]} />
        <T v="small" c="muted">{wa?.agentName ? `Agente: ${wa.agentName} (${wa.agentConnected ? 'conectado' : 'desconectado'})` : 'Nenhum agente de WhatsApp criado.'}</T>
      </View>
      <TextField label="Nossa oferta" value={offer} onChangeText={setOffer} multiline hint="O que a IA pode oferecer. Ela só oferece o que a empresa realmente precisa." />
      <TextField label="O que a IA pode afirmar (prazo, suporte)" value={terms} onChangeText={setTerms} multiline hint="Ex.: entrega do SaaS em até 1 dia útil; problemas técnicos resolvidos pela nossa equipe." />
      <Button label="Salvar" variant="secondary" loading={saving} onPress={save} />
      <T v="small" c="muted">{cfg?.auto ? `Próxima busca automática: ${data?.status.nextRunAt ? when(data.status.nextRunAt) : 'em breve'}.` : 'Busca automática desligada.'}</T>
    </Card>
  );

  return (
    <Screen tabbed title="Radar" width={1100}>
      <T c="muted" style={{ marginTop: wide ? -12 : -4 }}>Encontre empresas que precisam do que você vende, veja a necessidade de cada uma e acompanhe as negociações.</T>
      {!live ? (
        <Empty title="O Radar procura empresas de verdade" text="Ligue o app ao servidor (EXPO_PUBLIC_API_URL). O servidor pesquisa empresas, descobre se precisam de site, de agendamento online ou de um site novo, e conversa com elas pelo WhatsApp." />
      ) : (
        <>
          {error ? <ErrorState text={error} onRetry={load} /> : null}
          {!data && !error ? <View style={{ gap: 12 }}><Skeleton h={22} w="40%" /><Skeleton h={16} w="80%" /><Skeleton h={16} w="60%" /></View> : null}
          {data && !data.status.searchOn ? <Notice title="A busca de empresas não está ligada no servidor">Defina SERPER_API_KEY (ou TAVILY_API_KEY, ou GOOGLE_CSE_KEY e GOOGLE_CSE_ID) no servidor.</Notice> : null}
          {wa && !wa.official ? <Notice title="WhatsApp por integração não oficial">O WhatsApp pode restringir o número, principalmente em mensagens para quem nunca falou com você. O Radar mantém limite diário, intervalo, horário comercial e link de descadastro, mas o risco existe. Para evitar, use “Só e-mail” no primeiro contato.</Notice> : null}
          {data && cfg?.autoContact && cfg.firstContact === 'whatsapp' && wa && !wa.agentConnected ? <Notice title="Nenhum agente de WhatsApp conectado e ativo">O primeiro contato automático vai por e-mail, quando a empresa tiver.</Notice> : null}
          {data ? (
            <>
              <View style={wide ? { flexDirection: 'row', gap: 24, alignItems: 'flex-start' } : { gap: 16 }}>{searchCard}{autoCard}</View>
              <Card style={{ gap: 14 }}>
                <SectionTitle>Resumo</SectionTitle>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Stat label="Encontradas" value={data.stats.found} />
                  <Stat label="Para contatar" value={data.stats.pending} />
                  <Stat label="Contatadas" value={data.stats.contacted} />
                  <Stat label="Responderam" value={data.stats.replied} />
                  <Stat label="Em negociação" value={data.stats.negotiating} />
                  <Stat label="Fecharam" value={data.stats.closed} />
                  <Stat label="Sem necessidade" value={data.stats.noNeed} />
                </View>
                {data.status.lastRun ? <T v="small" c="muted">Última busca ({when(data.status.lastRunAt)}): {data.status.lastRun}</T> : null}
                <T v="small" c="muted">Envios hoje: {data.limits.sentToday} de {data.limits.maxPerDay}.</T>
              </Card>
              <Card style={{ gap: 14 }}>
                <SectionTitle>Negociações</SectionTitle>
                <Negotiation items={data.negotiation.items} activeId={data.negotiation.activeId} />
                <T v="caption" c="muted">Uma negociação por vez. Quem fica 10 minutos sem responder é pausado e retomado depois, com o histórico.</T>
              </Card>
              <View style={{ gap: 12 }}>
                <SectionTitle>Empresas encontradas</SectionTitle>
                <Chips>{FILTERS.map(([k, label]) => <Chip key={k} label={label} on={filter === k} onPress={() => { setFilter(k); setLimit(PAGE); }} />)}</Chips>
                {!list.length ? <Empty title={data.companies.length ? 'Nenhuma empresa neste filtro' : 'Nenhuma empresa ainda'} text={data.companies.length ? 'Troque o filtro para ver as outras.' : 'Informe a localização e toque em Pesquisar.'} /> : null}
                {shown.map((c) => (
                  <CompanyCard key={c.id} c={c} i={n++} open={openId === c.id} busy={busyId === c.id}
                    onToggle={() => setOpenId((x) => (x === c.id ? null : c.id))}
                    onContact={(ch) => act(c, () => remote.radarContact(c.id, ch), ch === 'email' ? 'E-mail enviado.' : 'Mensagem enviada pelo WhatsApp.')}
                    onPreview={() => act(c, () => remote.radarPreview(c.id), 'Esboço pronto.')}
                    onSkip={() => act(c, () => remote.radarSkip(c.id), 'Empresa descartada.')}
                    onCopy={copy} />
                ))}
                {list.length > shown.length ? <Button label={`Mostrar mais (${list.length - shown.length})`} variant="secondary" small full={false} onPress={() => setLimit((l) => l + PAGE)} /> : null}
              </View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
