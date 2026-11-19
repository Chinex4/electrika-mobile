import { Stack } from 'expo-router';

import { StaySafe } from '@/components/StaySafe';
import { Banner, Button, Failed, Heading, icons, Loading, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { call } from '@/lib/pay';
import { useResource } from '@/store/hooks';

type Safety = { stay_safe: { title: string; text: string }[]; before_a_visit: { title: string; text: string }[]; emergency_number: string; support_phone: string; support_tel: string };

/** Stay safe until we arrive, and what to have ready before a visit. Works without signing in. */
export default function SafetyScreen() {
  const t = useT();
  const q = useResource<Safety>('/care/safety/', { auth: false });
  const d = q.data;
  return (
    <Screen
      footer={d ? (
        <>
          <Button title={t('help.call112')} variant="danger" icon={icons.phone} onPress={() => call(d.emergency_number || '112')} />
        </>
      ) : null}>
      <Stack.Screen options={{ title: '' }} />
      <Title>{t('care.safety')}</Title>
      {q.isLoading ? <Loading /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          <Banner tone="alert" title={t('help.fire')}>{t('help.fireSub')}</Banner>
          <Heading>{t('help.staySafe')}</Heading>
          <StaySafe steps={d.stay_safe} />
          <Heading>{t('care.beforeVisit')}</Heading>
          <StaySafe steps={d.before_a_visit} />
          <Button title={t('help.callUs', { phone: d.support_phone })} variant="secondary" icon={icons.phone} onPress={() => call(d.support_tel || d.support_phone)} />
        </>
      ) : null}
    </Screen>
  );
}
