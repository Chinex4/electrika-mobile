import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Banner, Button, Failed, Field, HeroCard, icons, ListGroup, Loading, Row, Screen, SectionLabel, Stat, StatGrid, Title, type IconName } from '@/components/ui';
import { useT } from '@/i18n';
import { when } from '@/lib/format';
import { useAppDispatch, useAppSelector, useResource } from '@/store/hooks';
import { selectConsole } from '@/store/selectors';
import { checkConsole, lockConsole, unlockConsole } from '@/store/slices/console';
import { invalidate } from '@/store/slices/resources';
import type { ApiFailure, Person } from '@/types/api';

type Overview = {
  kpis: { label: string; value: string | number; sub?: string; tone?: string; section: string | null; filter: string }[];
  warnings: string[];
  failed_logins: number;
  activity: AuditRow[];
};
export type AuditRow = { id: number; at: string; who: Person | null; action: string; summary: string; subject: string; ip: string };
type Sections = { groups: { group: string; sections: { key: string; title: string; icon: string }[] }[] };

/** Hold a console page behind the lock: it shows the unlock form until unlocked on this phone. */
export function ConsoleGate({ children, tabbed }: { children: React.ReactNode; tabbed?: boolean }) {
  const dispatch = useAppDispatch();
  const lock = useAppSelector(selectConsole);
  useEffect(() => {
    if (!lock.checked) dispatch(checkConsole());
  }, [lock.checked, dispatch]);
  if (!lock.checked)
    return (
      <Screen tabbed={tabbed}>
        <Loading />
      </Screen>
    );
  if (!lock.unlocked) return <Unlock tabbed={tabbed} />;
  return <>{children}</>;
}

function Unlock({ tabbed }: { tabbed?: boolean }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const lock = useAppSelector(selectConsole);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function unlock() {
    if (!password) return setError(t('v.required'));
    setError('');
    try {
      await dispatch(unlockConsole(password)).unwrap();
      setPassword('');
      dispatch(invalidate(['/console/']));
    } catch (e) {
      setError((e as ApiFailure).message);
    }
  }

  return (
    <Screen tabbed={tabbed}>
      {tabbed ? <Title>{t('tab.console')}</Title> : null}
      <HeroCard tone="navy">
        <Text className="text-[22px] font-bold text-white">{t('office.console')}</Text>
        <Text className="text-sm leading-5 text-white/85">{t('office.consoleLocked')}</Text>
        <Text className="text-[13px] text-white/75">{t('console.idle', { n: lock.idleMinutes })}</Text>
      </HeroCard>
      {lock.blocked ? <Banner tone="alert">{t('console.blocked')}</Banner> : null}
      <Field label={t('auth.password')} placeholder={t('ph.auth.password')} secureTextEntry autoComplete="current-password" textContentType="password" value={password} onChangeText={(v) => {
          setPassword(v);
          setError('');
        }}
        onSubmitEditing={unlock} returnKeyType="go" icon={icons.lock} error={error || undefined} />
      <Button title={t('office.unlock')} icon={{ sf: 'lock.open.fill', md: 'lock_open' }} busy={lock.unlocking} onPress={unlock} size="lg" />
    </Screen>
  );
}

const SECTION_ICON: Record<string, IconName> = {
  clients: icons.people,
  contracts: icons.doc,
  jobs: icons.wrench,
  invoices: icons.money,
  orders: icons.box,
  products: icons.tag,
  // ElectriKa Marketplace (26 Nov 2026)
  'market-stores': icons.building,
  'market-listings': icons.tag,
  'market-reports': icons.eyeTrouble,
  'market-chat-reports': icons.warning,
  'market-promotions': icons.sparkles,
  'market-adverts': icons.megaphone,
  'market-advertisers': icons.handshake,
  'market-plan-subs': icons.seal,
  'market-payments': icons.money,
  'market-plans': icons.card,
  'market-promo-packages': icons.sparkles,
  'market-ad-packages': icons.megaphone,
  'market-placements': icons.list,
  'market-categories': icons.list,
  'market-settings': icons.key,
};

export function ConsoleScreen() {
  return (
    <ConsoleGate tabbed>
      <ConsoleHome />
    </ConsoleGate>
  );
}

function ConsoleHome() {
  const t = useT();
  const dispatch = useAppDispatch();
  const overview = useResource<Overview>('/console/overview/');
  const sections = useResource<Sections>('/console/sections/');
  const d = overview.data;

  return (
    <Screen tabbed refreshing={overview.isRefetching} onRefresh={overview.refetch}>
      <Title sub={t('console.sub')} right={<Button title={t('office.lock')} variant="secondary" size="sm" icon={icons.lock} onPress={() => dispatch(lockConsole())} />}>
        {t('tab.console')}
      </Title>
      {overview.isLoading ? <Loading rows={2} /> : null}
      {overview.error && !d ? <Failed error={overview.error} onRetry={overview.refetch} /> : null}
      {d?.warnings.map((w) => (
        <Banner key={w} tone="amber">
          {w}
        </Banner>
      ))}
      {d ? (
        <StatGrid>
          {d.kpis.map((k) => (
            <Stat
              key={k.label}
              label={k.sub ? `${k.label} · ${k.sub}` : k.label}
              value={k.value}
              tone={k.tone === 'bad' ? 'alert' : k.tone === 'good' ? 'leaf' : undefined}
              onPress={k.section ? () => router.push({ pathname: '/console/[key]', params: { key: k.section!, f: k.filter } }) : undefined}
            />
          ))}
        </StatGrid>
      ) : null}
      <SectionLabel>{t('console.people')}</SectionLabel>
      <ListGroup>
        <Row icon={icons.people} title={t('console.peopleTitle')} sub={t('console.peopleSub')} onPress={() => router.push('/console/people')} />
        <Row icon={icons.history} title={t('console.audit')} sub={d?.failed_logins ? t('console.failedLogins', { n: d.failed_logins }) : undefined} tone={d?.failed_logins ? 'alert' : 'brand'}
          onPress={() => router.push('/console/audit')} />
        <Row icon={icons.server} title={t('console.system')} onPress={() => router.push('/console/system')} last />
      </ListGroup>
      {sections.data?.groups.map((g) => (
        <View key={g.group} className="gap-2">
          <SectionLabel>{g.group}</SectionLabel>
          <ListGroup>
            {g.sections.map((s, i) => (
              <Row key={s.key} icon={SECTION_ICON[s.key] ?? icons.list} title={s.title} onPress={() => router.push({ pathname: '/console/[key]', params: { key: s.key } })}
                last={i === g.sections.length - 1} />
            ))}
          </ListGroup>
        </View>
      ))}
      {d?.activity.length ? <SectionLabel>{t('console.recent')}</SectionLabel> : null}
      {d?.activity.length ? (
        <ListGroup>
          {d.activity.slice(0, 8).map((a, i) => (
            <Row key={a.id} title={a.summary} sub={[a.who?.name ?? '—', when(a.at)].join(' · ')} last={i === Math.min(d.activity.length, 8) - 1} />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}
