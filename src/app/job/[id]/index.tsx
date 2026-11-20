import { Image } from 'expo-image';

import { remoteImage } from '@/api/client';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Avatar,
  Banner,
  Between,
  Body,
  brandColors,
  Button,
  Card,
  Choices,
  ConfirmSheet,
  cx,
  Failed,
  Heading,
  Icon,
  icons,
  KeyValue,
  Loading,
  OptionCards,
  Pill,
  Screen,
  SectionLabel,
  Sheet,
  Small,
} from '@/components/ui';
import { useT } from '@/i18n';
import { jobTone, when } from '@/lib/format';
import { call, openMaps } from '@/lib/pay';
import { notify } from '@/lib/toast';
import { useAction, useAppDispatch, useAppSelector, useResource } from '@/store/hooks';
import { selectJourney } from '@/store/selectors';
import { arrive, consentShown, startJourney } from '@/store/slices/journey';
import type { ApiFailure, Choice, Job } from '@/types/api';

type AssignOption = { id: number; name: string; label: string; note: string; free: boolean; selected: boolean; cluster_label: string };

export type JobDetail = Job & {
  description: string;
  client: { name: string; contact_name: string; phone: string };
  client_log: { when: string; text: string }[];
  is_my_job: boolean;
  can_act: boolean;
  can_submit_report: boolean;
  can_coordinate: boolean;
  needs_location_consent: boolean;
  report: { id: number; status: string; status_label: string; technician_notes: string; summary: string } | null;
  sent_back: { note: string; by: { name: string } | null; technician_notes: string } | null;
  review_mode: string;
  review_modes: Choice[];
  findings: Choice[];
  parts: { id: number; name: string; in_stock: number }[];
  countdown: string | null;
  assign_options?: AssignOption[];
  cancel_reasons?: Choice[];
  journey?: { kind: string; label: string; at: string; distance_km: number | null; detail: string }[];
};

const CLOSED = ['COMPLETED', 'CANCELLED'];

/** A job, for whoever may see it, with what they may do on it. */
export default function JobScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = Number(id);
  const path = `/job/${id}/`;
  const q = useResource<JobDetail>(path, { poll: 30_000 });
  const j = q.data;
  const dispatch = useAppDispatch();
  const journey = useAppSelector(selectJourney);
  const { run, busy } = useAction();
  const [sheet, setSheet] = useState<null | 'consent' | 'assign' | 'cancel' | 'arrive'>(null);
  const [reason, setReason] = useState<string | null>(null);
  const refresh = ['/job/', '/tech/', '/dispatch/', '/office/'];

  async function onMyWay(consent = false) {
    try {
      const res = await dispatch(startJourney({ jobId, consent })).unwrap();
      setSheet(null);
      notify.success(res.detail, res.sharing === 'foreground' ? t('job.keepOpen') : undefined);
    } catch (e) {
      const f = e as ApiFailure;
      if (f.status === 428) setSheet('consent');
      else notify.error(f.message);
    }
  }

  async function arrived() {
    setSheet(null);
    try {
      const res = await dispatch(arrive({ jobId, pin: !!j?.is_my_job })).unwrap();
      notify.success(res.detail);
    } catch (e) {
      notify.error((e as ApiFailure).message);
    }
  }

  const act = (p: string, body?: unknown) => run(p, { body, invalidate: refresh }).catch(() => undefined);

  if (!j) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('job.title') }} />
        {q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading hero />}
      </Screen>
    );
  }

  const closed = CLOSED.includes(j.status);
  const emergency = j.type === 'EMERGENCY';
  const mine = j.is_my_job;
  const footer = closed ? null : mine ? (
    j.status === 'EN_ROUTE' ? (
      <Button title={t('job.arrived')} variant="success" icon={icons.flag} busy={journey.busy} onPress={() => setSheet('arrive')} size="lg" />
    ) : j.status === 'ASSIGNED' || j.status === 'PENDING_ASSIGNMENT' ? (
      <Button title={t('job.onMyWay')} icon={icons.play} busy={journey.busy} onPress={() => (j.needs_location_consent ? setSheet('consent') : onMyWay())} size="lg" />
    ) : j.can_submit_report ? (
      <Button title={j.sent_back ? t('job.fixReport') : t('job.writeReport')} icon={icons.doc} onPress={() => router.push(`/job/${id}/report`)} size="lg" />
    ) : null
  ) : j.can_coordinate ? (
    <View className="flex-row gap-2">
      <Button className="flex-1" title={j.technician ? t('job.reassign') : t('job.assign')} icon={icons.person} onPress={() => setSheet('assign')} />
      <Button title={t('common.cancel')} variant="secondary" onPress={() => setSheet('cancel')} />
    </View>
  ) : null;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch} footer={footer}>
      <Stack.Screen options={{ title: j.type_label }} />

      <Card tone={emergency && !closed ? 'alert' : undefined}>
        <Between>
          <View className="flex-1 flex-row items-center gap-2">
            {emergency ? <Icon name={icons.bolt} size={16} color={brandColors.alert} /> : null}
            <Text className="flex-1 text-[22px] font-bold text-navy" numberOfLines={2}>
              {j.site?.name ?? j.client.name}
            </Text>
          </View>
          <Pill label={j.status_label} tone={jobTone(j.status)} />
        </Between>
        {j.countdown && !closed ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name={icons.clock} size={14} color={emergency ? brandColors.alert : brandColors.muted} />
            <Text className={cx('text-[15px] font-semibold', emergency ? 'text-alert-ink' : 'text-ink')}>{j.countdown}</Text>
          </View>
        ) : null}
        <Small>{[j.client.name, when(j.scheduled_for ?? j.raised_at)].filter(Boolean).join(' · ')}</Small>
      </Card>

      {j.sent_back ? (
        <Banner tone="amber" title={t('job.sentBack', { by: j.sent_back.by?.name ?? t('job.reviewer') })}>
          {j.sent_back.note}
        </Banner>
      ) : null}
      {mine && journey.jobId === jobId ? <Banner tone="info" icon={icons.location}>{journey.sharing === 'foreground' ? t('tech.sharingOpen') : t('tech.sharingBackground')}</Banner> : null}

      {j.description ? (
        <Card>
          <Heading>{t('job.whatsWrong')}</Heading>
          <Body>{j.description}</Body>
        </Card>
      ) : null}

      {j.site ? (
        <Card>
          <Heading>{t('job.where')}</Heading>
          <Body>{j.site.address_line || j.site.address}</Body>
          {j.site.landmark ? <Small>{j.site.landmark}</Small> : null}
          <View className="flex-row gap-2 pt-1">
            <Button className="flex-1" size="sm" variant="soft" title={t('job.directions')} icon={icons.map} onPress={() => openMaps(j.site?.lat, j.site?.lng, j.site!.name, j.site?.address)} />
            {j.client.phone ? <Button className="flex-1" size="sm" variant="soft" title={t('job.callClient')} icon={icons.phone} onPress={() => call(j.client.phone)} /> : null}
          </View>
          {!j.site.pinned ? <Small>{t('job.notPinned')}</Small> : null}
        </Card>
      ) : null}

      {j.technician ? (
        <Card>
          <View className="flex-row items-center gap-3">
            <Avatar url={j.technician.avatar_url} initials={j.technician.initials} />
            <View className="flex-1">
              <Heading>{j.technician.name}</Heading>
              <Small>{t('job.engineer')}</Small>
            </View>
            {!mine && j.technician.phone ? <Button size="sm" variant="soft" title={t('common.call')} icon={icons.phone} onPress={() => call(j.technician!.phone)} /> : null}
          </View>
        </Card>
      ) : null}

      {j.photos?.length ? (
        <>
          <SectionLabel>{t('job.photos')}</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {j.photos.map((p) => (p.url ? <Image key={p.id} source={remoteImage(p.url)} style={{ width: 120, height: 120, borderRadius: 14 }} contentFit="cover" /> : null))}
          </ScrollView>
        </>
      ) : null}

      {j.report ? (
        <Card>
          <Between>
            <Heading>{t('job.report')}</Heading>
            <Pill label={j.report.status_label} tone={j.report.status === 'APPROVED' ? 'leaf' : j.report.status === 'RETURNED' ? 'alert' : 'amber'} />
          </Between>
          {j.report.summary ? <Body>{j.report.summary}</Body> : null}
          {!j.report.summary && j.report.technician_notes ? <Small>{j.report.technician_notes}</Small> : null}
        </Card>
      ) : null}

      {j.client_log.length ? (
        <Card>
          <Heading>{t('job.clientLog')}</Heading>
          {j.client_log.map((l, i) => (
            <KeyValue key={i} label={when(l.when)} value={l.text} />
          ))}
        </Card>
      ) : null}

      {j.can_coordinate ? (
        <>
          <SectionLabel>{t('job.coordinate')}</SectionLabel>
          <Card>
            <Choices
              label={t('job.reviewWhen')}
              options={j.review_modes}
              value={j.review_mode}
              onChange={(k) => act(`/job/${id}/review-timing/`, { report_review: k })}
            />
            <View className="flex-row flex-wrap gap-2 pt-1">
              {j.status === 'EN_ROUTE' ? <Button size="sm" variant="soft" title={t('job.resendTracking')} icon={icons.send} busy={busy} onPress={() => act(`/job/${id}/resend-tracking/`)} /> : null}
              {j.status === 'EN_ROUTE' ? <Button size="sm" variant="soft" title={t('job.markArrived')} icon={icons.flag} onPress={() => setSheet('arrive')} /> : null}
              {j.can_submit_report && j.status === 'IN_PROGRESS' ? <Button size="sm" variant="soft" title={t('job.writeReport')} icon={icons.doc} onPress={() => router.push(`/job/${id}/report`)} /> : null}
            </View>
          </Card>
          {j.journey?.length ? (
            <Card>
              <Heading>{t('job.journey')}</Heading>
              {j.journey.map((e, i) => (
                <KeyValue key={i} label={when(e.at)} value={[e.label, e.distance_km != null ? `${e.distance_km} km` : '', e.detail].filter(Boolean).join(' · ')} />
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      <ConfirmSheet
        open={sheet === 'consent'}
        onClose={() => {
          setSheet(null);
          dispatch(consentShown());
        }}
        title={t('job.consentTitle')}
        message={t('job.consentSub')}
        confirm={t('job.consentYes')}
        variant="primary"
        busy={journey.busy}
        onConfirm={() => onMyWay(true)}
      />
      <ConfirmSheet
        open={sheet === 'arrive'}
        onClose={() => setSheet(null)}
        title={t('job.arriveTitle')}
        message={mine ? t('job.arriveSub') : t('job.arriveOfficeSub')}
        confirm={t('job.arrived')}
        variant="success"
        busy={journey.busy}
        onConfirm={arrived}
      />
      <Sheet open={sheet === 'assign'} onClose={() => setSheet(null)} title={t('job.chooseEngineer')} sub={j.site?.area_label}>
        {(j.assign_options ?? []).map((o) => (
          <Pressable
            key={o.id}
            disabled={busy}
            onPress={async () => {
              try {
                await run(`/job/${id}/assign/`, { body: { technician: o.id }, invalidate: refresh });
                setSheet(null);
              } catch {
                // toast shown
              }
            }}
            className={cx('flex-row items-center gap-3 rounded-2xl border-[1.5px] bg-white p-4 active:opacity-80', o.selected ? 'border-brand' : 'border-line')}>
            <View className={cx('h-2.5 w-2.5 rounded-full', o.free ? 'bg-leaf' : 'bg-edge')} />
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-navy">{o.name}</Text>
              <Small>{[o.cluster_label, o.note].filter(Boolean).join(' · ')}</Small>
            </View>
            {o.selected ? <Icon name={{ sf: 'checkmark', md: 'check' }} size={16} /> : null}
          </Pressable>
        ))}
        {!j.assign_options?.length ? <Small>{t('job.noEngineers')}</Small> : null}
      </Sheet>
      <Sheet
        open={sheet === 'cancel'}
        onClose={() => setSheet(null)}
        title={t('job.cancelTitle')}
        sub={t('job.cancelSub')}
        footer={
          <Button
            title={t('job.cancelJob')}
            variant="danger"
            disabled={!reason}
            busy={busy}
            onPress={async () => {
              try {
                await run(`/job/${id}/cancel/`, { body: { reason }, invalidate: refresh });
                setSheet(null);
                router.back();
              } catch {
                // toast shown
              }
            }}
          />
        }>
        <OptionCards options={j.cancel_reasons ?? []} value={reason} onChange={setReason} />
      </Sheet>
    </Screen>
  );
}
