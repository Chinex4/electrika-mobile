import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { JobCard } from '@/components/JobCard';
import {
  Between,
  Card,
  Empty,
  Failed,
  Heading,
  HeroCard,
  HeroStat,
  HeroStats,
  IconButton,
  icons,
  ListGroup,
  Loading,
  Pill,
  Row,
  Screen,
  SectionLabel,
  Segmented,
  Small,
  Stat,
  StatGrid,
  Title,
} from '@/components/ui';
import { useT } from '@/i18n';
import { day, naira, when } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { Choice, JobRow, Person, StaffOrder } from '@/types/api';

// ---------------------------------------------------------------- Dispatch board (Dispatch, Program Manager, Account Managers)

type Board = { summary: { needs_technician: number; at_risk: number; on_the_way: number; on_site: number }; jobs: JobRow[]; can_coordinate: boolean };
type Filter = 'all' | 'waiting' | 'risk' | 'moving';

export function BoardScreen({ tabbed = true }: { tabbed?: boolean }) {
  const t = useT();
  const q = useResource<Board>('/dispatch/board/', { poll: 30_000 });
  const [filter, setFilter] = useState<Filter>('all');
  const d = q.data;
  const jobs = (d?.jobs ?? []).filter((j) =>
    filter === 'waiting' ? !j.technician : filter === 'risk' ? ['AT_RISK', 'BREACHED'].includes(j.live_sla ?? '') : filter === 'moving' ? j.status === 'EN_ROUTE' : true,
  );
  return (
    <Screen tabbed={tabbed} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {tabbed ? (
        <Title sub={t('board.sub')} right={<IconButton icon={icons.plus} label={t('board.newJob')} variant="primary" onPress={() => router.push('/office/new-job')} />}>
          {t('tab.board')}
        </Title>
      ) : null}
      {d ? (
        <StatGrid>
          <Stat label={t('office.needsTech')} value={d.summary.needs_technician} tone={d.summary.needs_technician ? 'alert' : undefined} />
          <Stat label={t('office.atRisk')} value={d.summary.at_risk} tone={d.summary.at_risk ? 'alert' : undefined} />
          <Stat label={t('office.onTheWay')} value={d.summary.on_the_way} tone="brand" />
          <Stat label={t('office.onSite')} value={d.summary.on_site} tone="leaf" />
        </StatGrid>
      ) : null}
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: t('common.all'), count: d?.jobs.length },
          { key: 'waiting', label: t('board.waiting'), count: d?.summary.needs_technician },
          { key: 'risk', label: t('board.risk'), count: d?.summary.at_risk },
          { key: 'moving', label: t('board.moving') },
        ]}
      />
      {q.isLoading ? <Loading rows={4} /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d && !jobs.length ? <Empty title={t('board.quiet')} icon={icons.check} /> : null}
      {jobs.map((j) => (
        <JobCard key={j.id} job={j} />
      ))}
    </Screen>
  );
}

// ---------------------------------------------------------------- report sign-off (Dispatch, Program Manager)

export type ReportRow = { id: number; client: string; site: string; technician: Person | null; status_label: string; generated_at: string; waiting_on_site: boolean; job_id: number | null };

export function ReportsScreen({ tabbed = true }: { tabbed?: boolean }) {
  const t = useT();
  const q = useResource<{ my_stage: string; mine: ReportRow[]; with_other: ReportRow[]; sent_back: ReportRow[] }>('/dispatch/reports/', { poll: 30_000 });
  const row = (r: ReportRow, open = true) => (
    <Card key={r.id} onPress={open ? () => router.push(`/office/review/${r.id}`) : undefined} tone={r.waiting_on_site ? 'alert' : undefined}>
      <Between>
        <Heading className="flex-1" lines={1}>
          {r.site || r.client}
        </Heading>
        {r.waiting_on_site ? <Pill label={t('review.onSite')} tone="alert" /> : <Pill label={r.status_label} tone="amber" />}
      </Between>
      <Small>{[r.client, r.technician?.name, when(r.generated_at)].filter(Boolean).join(' · ')}</Small>
    </Card>
  );
  return (
    <Screen tabbed={tabbed} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {tabbed ? <Title sub={q.data ? t('review.yourStage', { stage: q.data.my_stage }) : undefined}>{t('tab.reports')}</Title> : null}
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.mine.length ? <Empty title={t('review.nothing')} icon={icons.seal} /> : null}
      {q.data?.mine.map((r) => row(r))}
      {q.data?.with_other.length ? <SectionLabel>{t('review.withOther')}</SectionLabel> : null}
      {q.data?.with_other.map((r) => row(r, false))}
      {q.data?.sent_back.length ? <SectionLabel>{t('review.sentBack')}</SectionLabel> : null}
      {q.data?.sent_back.map((r) => row(r, false))}
    </Screen>
  );
}

// ---------------------------------------------------------------- Shop orders

export function OrdersScreen({ tabbed = true }: { tabbed?: boolean }) {
  const t = useT();
  const [show, setShow] = useState<'open' | 'done' | 'all'>('open');
  const q = useResource<{ counts: { open: number; waiting: number }; results: StaffOrder[] }>(`/office/orders/?show=${show}`);
  return (
    <Screen tabbed={tabbed} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {tabbed ? <Title sub={q.data ? t('orders.sub', { open: q.data.counts.open, waiting: q.data.counts.waiting }) : undefined}>{t('tab.orders')}</Title> : null}
      <Segmented value={show} onChange={setShow} options={[{ key: 'open', label: t('orders.open'), count: q.data?.counts.open }, { key: 'done', label: t('orders.done') }, { key: 'all', label: t('common.all') }]} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('orders.none')} icon={icons.box} /> : null}
      {q.data?.results.map((o) => (
        <Card key={o.id} onPress={() => router.push(`/office/order/${o.id}`)} tone={o.status === 'AWAITING_PAYMENT' ? 'amber' : undefined}>
          <Between>
            <Heading className="flex-1" lines={1}>
              {o.number} · {o.customer.name}
            </Heading>
            <Pill label={o.status_label} tone={o.is_open ? 'amber' : 'leaf'} />
          </Between>
          <Small lines={1}>{[naira(o.total), o.method_label, o.summary].join(' · ')}</Small>
        </Card>
      ))}
    </Screen>
  );
}

// ---------------------------------------------------------------- Account Manager

export type NewRequest = {
  client: { id: number; name: string; contact_phone: string; origin_label: string };
  area: string;
  needs: string;
  received: string;
  reply_by: string | null;
  overdue: boolean;
  owner_display: string;
  is_mine: boolean;
  can_take: boolean;
  can_close: boolean;
  new_today: boolean;
};

type ClientRow = { client: { id: number; name: string }; contract: { tier_label: string; end_date: string } | null; days_to_renewal: number | null; overdue_count: number; overdue_amount: string };
type AmData = {
  client_count: number;
  renewals_due: ClientRow[];
  overdue_clients: ClientRow[];
  cross_sell_candidates: ClientRow[];
  open_concerns: { id: number; client: string; category_label: string; reply_due: string; description: string }[];
  follow_ups: { id: number; client: { id: number; name: string }; note: string; asked_by: Person | null }[];
  late_calls: JobRow[];
  new_requests: NewRequest[];
};

export function AmToday() {
  const t = useT();
  const q = useResource<AmData>('/office/account-manager/');
  const d = q.data;
  return (
    <Screen tabbed refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Title>{t('tab.today')}</Title>
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          <HeroCard>
            <Text className="text-[13px] font-semibold text-white/85">{t('am.yourClients')}</Text>
            <Text className="text-[34px] font-extrabold text-white">{d.client_count}</Text>
            <HeroStats>
              <HeroStat value={d.renewals_due.length} label={t('office.renewals')} />
              <HeroStat value={d.overdue_clients.length} label={t('am.owing')} />
              <HeroStat value={d.new_requests.length} label={t('office.newRequests')} />
            </HeroStats>
          </HeroCard>
          {d.new_requests.length ? <SectionLabel right={<Text onPress={() => router.push('/am/requests')} className="text-sm font-semibold text-accent">{t('common.seeAll')}</Text>}>{t('office.newRequests')}</SectionLabel> : null}
          {d.new_requests.slice(0, 3).map((r) => (
            <RequestCard key={r.client.id} r={r} />
          ))}
          {d.follow_ups.length ? <SectionLabel>{t('office.followUps')}</SectionLabel> : null}
          {d.follow_ups.map((f) => (
            <Card key={f.id} onPress={() => router.push(`/office/client/${f.client.id}`)}>
              <Heading>{f.client.name}</Heading>
              <Small>{f.note}</Small>
              {f.asked_by ? <Small>{t('am.askedBy', { name: f.asked_by.name })}</Small> : null}
            </Card>
          ))}
          {d.renewals_due.length ? <SectionLabel>{t('office.renewals')}</SectionLabel> : null}
          {d.renewals_due.length ? (
            <ListGroup>
              {d.renewals_due.map((r, i) => (
                <Row key={r.client.id} icon={icons.calendar} title={r.client.name} sub={`${r.contract?.tier_label ?? ''} · ${t('am.renewsIn', { n: r.days_to_renewal ?? 0 })}`}
                  onPress={() => router.push(`/office/client/${r.client.id}`)} last={i === d.renewals_due.length - 1} />
              ))}
            </ListGroup>
          ) : null}
          {d.overdue_clients.length ? <SectionLabel>{t('am.owing')}</SectionLabel> : null}
          {d.overdue_clients.length ? (
            <ListGroup>
              {d.overdue_clients.map((r, i) => (
                <Row key={r.client.id} icon={icons.money} tone="alert" title={r.client.name} sub={t('am.overdueN', { n: r.overdue_count, amount: naira(r.overdue_amount) })}
                  onPress={() => router.push(`/office/client/${r.client.id}`)} last={i === d.overdue_clients.length - 1} />
              ))}
            </ListGroup>
          ) : null}
          {d.open_concerns.length ? <SectionLabel>{t('am.concerns')}</SectionLabel> : null}
          {d.open_concerns.map((c) => (
            <Card key={c.id} tone={new Date(c.reply_due) < new Date() ? 'alert' : undefined}>
              <Between>
                <Heading className="flex-1">{c.client}</Heading>
                <Pill label={c.category_label} tone="amber" />
              </Between>
              <Small lines={3}>{c.description}</Small>
              <Small>{t('am.replyBy', { day: day(c.reply_due) })}</Small>
            </Card>
          ))}
          {d.late_calls.length ? <SectionLabel>{t('am.lateCalls')}</SectionLabel> : null}
          {d.late_calls.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
          <SectionLabel>{t('am.more')}</SectionLabel>
          <ListGroup>
            <Row icon={icons.quote} title={t('am.quotes')} onPress={() => router.push('/office/quotes')} />
            <Row icon={icons.handshake} title={t('am.partners')} onPress={() => router.push('/office/partners')} />
            <Row icon={icons.tag} title={t('am.products')} onPress={() => router.push('/office/products')} />
            <Row icon={icons.box} title={t('tab.orders')} onPress={() => router.push('/office/orders')} />
            <Row icon={icons.grid} title={t('tab.board')} onPress={() => router.push('/office/board')} last />
          </ListGroup>
        </>
      ) : null}
    </Screen>
  );
}

export function RequestCard({ r }: { r: NewRequest }) {
  const t = useT();
  return (
    <Card onPress={() => router.push({ pathname: '/office/request/[id]', params: { id: r.client.id } })} tone={r.overdue ? 'alert' : undefined}>
      <Between>
        <Heading className="flex-1" lines={1}>
          {r.client.name}
        </Heading>
        {r.new_today ? <Pill label={t('requests.new')} tone="brand" /> : null}
      </Between>
      <Small lines={3}>{[r.client.origin_label, r.area, r.needs].filter(Boolean).join(' · ')}</Small>
      <Between>
        <Pill label={r.owner_display || t('requests.notTaken')} tone={r.overdue ? 'alert' : r.owner_display ? 'leaf' : 'amber'} />
        <Small>{r.reply_by ? t('requests.replyBy', { day: day(r.reply_by) }) : when(r.received)}</Small>
      </Between>
    </Card>
  );
}

export function RequestsScreen({ tabbed = true }: { tabbed?: boolean }) {
  const t = useT();
  const q = useResource<{ results: NewRequest[]; close_reasons: Choice[] }>('/office/requests/', { poll: 60_000 });
  return (
    <Screen tabbed={tabbed} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {tabbed ? <Title sub={t('requests.sub')}>{t('office.newRequests')}</Title> : null}
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('requests.none')} icon={icons.inbox} /> : null}
      {q.data?.results.map((r) => (
        <RequestCard key={r.client.id} r={r} />
      ))}
    </Screen>
  );
}

// ---------------------------------------------------------------- Voice (power reports), staff side

type VoiceRow = { id: number; reference: string; kind_label: string; name: string; step: string; due: string | null; overdue: boolean; status_label: string; needs_action: boolean; area: string };

export function VoiceScreen({ tabbed = true }: { tabbed?: boolean }) {
  const t = useT();
  const [show, setShow] = useState('open');
  const q = useResource<{ results: VoiceRow[]; filters: Choice[] }>(`/office/voice/?show=${show}`);
  return (
    <Screen tabbed={tabbed} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {tabbed ? <Title sub={t('voice.staffSub')}>{t('tab.voice')}</Title> : null}
      {q.data?.filters.length ? <Segmented value={show} onChange={setShow} options={q.data.filters.slice(0, 4)} /> : null}
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('voice.noneStaff')} icon={icons.megaphone} /> : null}
      {q.data?.results.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/office/voice/${r.id}`)} tone={r.overdue ? 'alert' : r.needs_action ? 'amber' : undefined}>
          <Between>
            <Heading className="flex-1" lines={1}>
              {r.reference} · {r.kind_label}
            </Heading>
            <Pill label={r.status_label} tone={r.overdue ? 'alert' : 'brand'} />
          </Between>
          <Small>{[r.name, r.step, r.due ? t('voice.due', { day: day(r.due) }) : ''].filter(Boolean).join(' · ')}</Small>
        </Card>
      ))}
    </Screen>
  );
}

// ---------------------------------------------------------------- Accounts

type Waiting = { kind: 'order' | 'invoice'; pk: number; title: string; ref: string; amount: string; due?: string; overdue?: boolean };
type Money = {
  money_in: string;
  paystack_total: string;
  transfer_total: string;
  payments_today: number;
  waiting: Waiting[];
  overdue_count: number;
  overdue_sum: string;
  paystack_today: { title: string; amount: string }[];
};

export function MoneyScreen({ tabbed = true }: { tabbed?: boolean }) {
  const t = useT();
  const q = useResource<Money>('/office/accounts/', { poll: 60_000 });
  const d = q.data;
  return (
    <Screen tabbed={tabbed} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {tabbed ? <Title>{t('tab.money')}</Title> : null}
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          <HeroCard>
            <Text className="text-[13px] font-semibold text-white/85">{t('office.moneyIn')}</Text>
            <Text className="text-[34px] font-extrabold text-white">{naira(d.money_in)}</Text>
            <HeroStats>
              <HeroStat value={naira(d.paystack_total)} label="Paystack" />
              <HeroStat value={naira(d.transfer_total)} label={t('money.transfers')} />
              <HeroStat value={d.payments_today} label={t('money.payments')} />
            </HeroStats>
          </HeroCard>
          <StatGrid>
            <Stat label={t('office.toConfirm')} value={d.waiting.length} tone={d.waiting.length ? 'brand' : undefined} />
            <Stat label={t('office.overdue')} value={d.overdue_count} tone={d.overdue_count ? 'alert' : undefined} />
            <Stat label={t('money.overdueSum')} value={naira(d.overdue_sum)} tone={d.overdue_count ? 'alert' : undefined} />
          </StatGrid>
          <SectionLabel>{t('money.waiting')}</SectionLabel>
          {!d.waiting.length ? <Empty title={t('money.nothingWaiting')} icon={icons.check} /> : null}
          {d.waiting.map((w) => (
            <Card key={`${w.kind}-${w.pk}`} onPress={() => router.push(`/office/confirm/${w.kind}/${w.pk}`)} tone={w.overdue ? 'alert' : undefined}>
              <Between>
                <Heading className="flex-1" lines={1}>
                  {w.title}
                </Heading>
                <Text className="text-[16px] font-bold text-navy">{naira(w.amount)}</Text>
              </Between>
              <Small>{[w.ref, w.due ? t('money.due', { day: day(w.due) }) : ''].filter(Boolean).join(' · ')}</Small>
            </Card>
          ))}
          {d.paystack_today.length ? <SectionLabel>{t('money.paystackToday')}</SectionLabel> : null}
          {d.paystack_today.length ? (
            <ListGroup>
              {d.paystack_today.map((p, i) => (
                <Row key={i} icon={icons.card} tone="leaf" title={p.title} right={<Text className="font-bold text-navy">{naira(p.amount)}</Text>} last={i === d.paystack_today.length - 1} />
              ))}
            </ListGroup>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

type InvoiceRow = { id: number; ref: string; client: string; amount: string; due_date: string; days_over: number | null; status_label: string; reminder_count: number };

export function InvoicesScreen({ tabbed = true }: { tabbed?: boolean }) {
  const t = useT();
  const [show, setShow] = useState<'overdue' | 'due' | 'paid'>('overdue');
  const q = useResource<{ results: InvoiceRow[]; paid_month: string }>(`/office/accounts/invoices/?show=${show}`);
  return (
    <Screen tabbed={tabbed} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {tabbed ? <Title sub={q.data ? t('invoices.paidMonth', { amount: naira(q.data.paid_month) }) : undefined}>{t('tab.invoices')}</Title> : null}
      <Segmented value={show} onChange={setShow} options={[{ key: 'overdue', label: t('invoices.overdue') }, { key: 'due', label: t('invoices.due') }, { key: 'paid', label: t('invoices.paid') }]} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('invoices.none')} icon={icons.doc} /> : null}
      {q.data?.results.map((i) => (
        <Card key={i.id} onPress={show === 'paid' ? undefined : () => router.push(`/office/confirm/invoice/${i.id}`)} tone={show === 'overdue' ? 'alert' : undefined}>
          <Between>
            <Heading className="flex-1" lines={1}>
              {i.client}
            </Heading>
            <Text className="text-[16px] font-bold text-navy">{naira(i.amount)}</Text>
          </Between>
          <Small>
            {[i.ref, t('money.due', { day: day(i.due_date) }), show === 'overdue' && i.days_over ? t('invoices.daysOver', { n: i.days_over }) : '', i.reminder_count ? t('invoices.reminded', { n: i.reminder_count }) : '']
              .filter(Boolean)
              .join(' · ')}
          </Small>
        </Card>
      ))}
    </Screen>
  );
}

// ---------------------------------------------------------------- Program Manager

type PmData = {
  kpis: { active_contracts: number; arr: string; sla_compliance: number | null; first_time_fix_rate: number | null; overdue_invoice_count: number; open_emergency_jobs: number; client_count: number };
  tier_breakdown: { tier_display: string; count: number; arr: string }[];
  expiring_soon: { id: number; client: string; client_id: number; tier_label: string; end_date: string }[];
  clock: { job: string; label: string; last_ok: string | null; last_failed: boolean; stale: boolean }[];
  today: {
    on_time: number | null;
    open_total: number;
    to_sign: number;
    new_today: number;
    at_risk: JobRow[];
    open_counts: { waiting: number; on_the_way: number; on_site: number };
    on_duty: unknown[];
    engineer_count: number;
    channels: { label: string; n: number; pct: number }[];
  };
  new_requests: NewRequest[];
};

export function PmToday() {
  const t = useT();
  const q = useResource<PmData>('/office/program-manager/', { poll: 60_000 });
  const d = q.data;
  const unhealthy = d?.clock.filter((c) => c.stale || c.last_failed) ?? [];
  return (
    <Screen tabbed refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Title>{t('tab.today')}</Title>
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          <HeroCard>
            <Text className="text-[13px] font-semibold text-white/85">{t('office.onTime')}</Text>
            <Text className="text-[34px] font-extrabold text-white">{d.today.on_time !== null ? `${d.today.on_time}%` : '–'}</Text>
            <HeroStats>
              <HeroStat value={d.today.open_total} label={t('office.openJobs')} />
              <HeroStat value={d.today.to_sign} label={t('office.toSign')} />
              <HeroStat value={`${d.today.on_duty.length}/${d.today.engineer_count}`} label={t('office.engineersOnDuty')} />
            </HeroStats>
          </HeroCard>
          {unhealthy.length ? (
            <Card tone="alert">
              <Heading>{t('pm.clockTitle')}</Heading>
              <Small>{unhealthy.map((c) => c.label).join(' · ')}</Small>
            </Card>
          ) : null}
          <StatGrid>
            <Stat label={t('pm.plans')} value={d.kpis.active_contracts} />
            <Stat label={t('pm.arr')} value={naira(d.kpis.arr)} />
            <Stat label={t('pm.sla')} value={d.kpis.sla_compliance !== null ? `${d.kpis.sla_compliance}%` : '–'} tone="leaf" />
            <Stat label={t('pm.ftf')} value={d.kpis.first_time_fix_rate !== null ? `${d.kpis.first_time_fix_rate}%` : '–'} />
            <Stat label={t('office.overdue')} value={d.kpis.overdue_invoice_count} tone={d.kpis.overdue_invoice_count ? 'alert' : undefined} />
            <Stat label={t('office.newRequests')} value={d.new_requests.length} tone={d.new_requests.length ? 'brand' : undefined} />
          </StatGrid>
          {d.today.at_risk.length ? <SectionLabel>{t('office.atRisk')}</SectionLabel> : null}
          {d.today.at_risk.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
          <SectionLabel>{t('pm.newToday', { n: d.today.new_today })}</SectionLabel>
          <Card>
            {d.today.channels.map((c) => (
              <View key={c.label} className="gap-1 py-1">
                <Between>
                  <Text className="text-sm text-ink">{c.label}</Text>
                  <Text className="text-sm font-bold text-navy">{c.n}</Text>
                </Between>
                <View className="h-1.5 overflow-hidden rounded-full bg-mist">
                  <View className="h-full rounded-full bg-brand" style={{ width: `${Math.max(c.pct, c.n ? 4 : 0)}%` }} />
                </View>
              </View>
            ))}
          </Card>
          {d.tier_breakdown.length ? (
            <Card>
              <Heading>{t('pm.mix')}</Heading>
              {d.tier_breakdown.map((r) => (
                <Between key={r.tier_display}>
                  <Small>{`${r.tier_display} · ${r.count}`}</Small>
                  <Text className="text-sm font-semibold text-navy">{naira(r.arr)}</Text>
                </Between>
              ))}
            </Card>
          ) : null}
          {d.expiring_soon.length ? <SectionLabel>{t('pm.expiring')}</SectionLabel> : null}
          {d.expiring_soon.length ? (
            <ListGroup>
              {d.expiring_soon.map((c, i) => (
                <Row key={c.id} icon={icons.calendar} tone="amber" title={c.client} sub={`${c.tier_label} · ${day(c.end_date)}`}
                  onPress={() => router.push(`/office/client/${c.client_id}`)} last={i === d.expiring_soon.length - 1} />
              ))}
            </ListGroup>
          ) : null}
          <SectionLabel>{t('pm.everything')}</SectionLabel>
          <ListGroup>
            <Row icon={icons.seal} title={t('office.toSign')} sub={t('pm.waitingN', { n: d.today.to_sign })} onPress={() => router.push('/office/reviews')} />
            <Row icon={icons.inbox} title={t('office.newRequests')} sub={t('pm.waitingN', { n: d.new_requests.length })} onPress={() => router.push('/office/requests')} />
            <Row icon={icons.people} title={t('pm.team')} onPress={() => router.push('/office/team')} />
            <Row icon={icons.money} tone="leaf" title={t('tab.money')} onPress={() => router.push('/office/money')} />
            <Row icon={icons.doc} tone="leaf" title={t('tab.invoices')} onPress={() => router.push('/office/invoices')} />
            <Row icon={icons.box} title={t('tab.orders')} onPress={() => router.push('/office/orders')} />
            <Row icon={icons.tag} title={t('am.products')} onPress={() => router.push('/office/products')} />
            <Row icon={icons.quote} title={t('am.quotes')} onPress={() => router.push('/office/quotes')} />
            <Row icon={icons.handshake} title={t('am.partners')} onPress={() => router.push('/office/partners')} />
            <Row icon={icons.megaphone} tone="amber" title={t('tab.voice')} onPress={() => router.push('/office/voices')} last />
          </ListGroup>
        </>
      ) : null}
    </Screen>
  );
}
