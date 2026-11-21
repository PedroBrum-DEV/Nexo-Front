import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useApp } from '../lib/store';
import { color } from '../lib/theme';
import { Button, Card, haptic, Icon, SectionTitle, T } from './ui';
import { useTheme } from '../lib/ThemeContext';

// Primeiros passos: o que falta para o primeiro agente atender de verdade. O progresso vem do estado real do app.
export default function Onboarding() {
  useTheme();
  const { agents, tested, onboardingDismissed, dismissOnboarding, setAgentStatus, say } = useApp();
  if (onboardingDismissed) return null;
  const first = agents[0];
  const connected = agents.find((a) => a.connection === 'open');
  const toConfig = (a = first) => a && router.push({ pathname: '/agente/[id]', params: { id: a.id, tab: 'config' } });

  const steps = [
    { id: 'agent', title: 'Crie seu primeiro agente', text: 'Escolha um modelo para o seu tipo de negócio ou comece do zero. Leva poucos minutos.', done: agents.length > 0, cta: 'Criar agente', go: () => router.push('/agente/novo'), hint: '' },
    { id: 'wa', title: 'Conecte o WhatsApp', text: 'Leia o QR code com o número que vai atender seus clientes.', done: !!connected, cta: 'Conectar', go: () => toConfig(), hint: agents.length ? '' : 'Crie um agente primeiro.' },
    { id: 'test', title: 'Teste o agente', text: 'Escreva como se fosse um cliente e veja como ele responde.', done: agents.some((a) => tested[a.id]), cta: 'Testar', go: () => toConfig(), hint: agents.length ? '' : 'Crie um agente primeiro.' },
    { id: 'on', title: 'Ative o atendimento', text: 'Quando tudo estiver certo, o agente começa a responder seus clientes.', done: agents.some((a) => a.status === 'active'), cta: 'Ativar agora', go: () => (connected ? setAgentStatus(connected.id, 'active').catch((e: Error) => say(e.message)) : toConfig()), hint: connected ? '' : 'Conecte o WhatsApp antes de ativar.' },
  ];
  const doneN = steps.filter((s) => s.done).length;
  const current = steps.findIndex((s) => !s.done);
  const complete = doneN === steps.length;

  return (
    <Card style={{ gap: 16 }} >
      <View style={{ gap: 10 }}>
        <SectionTitle right={<T v="label" c="muted" num accessibilityLabel={`${doneN} de ${steps.length} passos concluídos`}>{doneN} de {steps.length}</T>}>{complete ? 'Tudo pronto' : 'Primeiros passos'}</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="progressbar" accessibilityLabel="Progresso dos primeiros passos" accessibilityValue={{ min: 0, max: steps.length, now: doneN }}>
          {steps.map((s) => <View key={s.id} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: s.done ? color.primary : color.line }} />)}
        </View>
      </View>

      {complete ? (
        <View style={{ gap: 12 }}>
          <T c="muted">Seu agente está atendendo. Acompanhe pelo Resumo e pelos Registros; quando algo precisar de você, aparece em “Para decidir”.</T>
          <Button label="Dispensar" variant="secondary" full={false} small onPress={() => { haptic.success(); dismissOnboarding(); }} />
        </View>
      ) : (
        <View>
          {steps.map((s, i) => {
            const isCurrent = i === current;
            return (
              <View key={s.id} style={{ flexDirection: 'row', gap: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }} accessible={!isCurrent} accessibilityLabel={`${s.title}. ${s.done ? 'Concluído' : 'Pendente'}`}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: s.done ? color.success : isCurrent ? color.primary : color.subtle }}>
                  {s.done ? <Animated.View entering={ZoomIn.duration(350)}><Icon name="check" size={16} c="white" /></Animated.View> : <T v="label" c={isCurrent ? 'onPrimary' : 'muted'} num style={{ fontSize: 13 }}>{i + 1}</T>}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="label" c={s.done ? 'muted' : 'ink'} style={{ fontSize: 15, textDecorationLine: s.done ? 'line-through' : 'none' }}>{s.title}</T>
                  {isCurrent && <T v="small" c="muted">{s.text}</T>}
                  {isCurrent && s.hint ? <T v="small" c="goldDeep">{s.hint}</T> : null}
                  {isCurrent && <View style={{ marginTop: 8, alignItems: 'flex-start' }}><Button label={s.cta} small full={false} onPress={s.go} /></View>}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
