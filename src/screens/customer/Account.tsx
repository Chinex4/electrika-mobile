import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useState } from 'react';

import { api } from '@/api/client';
import { ConfirmSheet, icons, ListGroup, Row, SectionLabel } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { MeScreen } from '@/screens/MeScreen';
import { useAction, useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectHasPlan } from '@/store/selectors';
import { signOut } from '@/store/slices/session';
import type { ApiFailure } from '@/types/api';

/** The customer's account: their Me page plus plan, places, money and their data. */
export function AccountScreen() {
  const t = useT();
  const hasPlan = useAppSelector(selectHasPlan);
  const dispatch = useAppDispatch();
  const { run, busy } = useAction();
  const [closing, setClosing] = useState(false);

  async function download() {
    try {
      const data = await api('/me/data/');
      const file = new File(Paths.cache, 'electrika-my-data.json');
      file.create({ overwrite: true });
      await file.write(JSON.stringify(data, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('account.myData') });
      else notify.success(t('account.dataReady'));
    } catch (e) {
      notify.error((e as ApiFailure).message ?? String(e));
    }
  }

  async function close() {
    try {
      const res = await run<{ result: 'asked' | 'closed' }>('/me/close/', { body: { confirm: 'yes' } });
      setClosing(false);
      if (res.result === 'closed') {
        await dispatch(signOut());
        router.replace('/sign-in');
      }
    } catch {
      // shown as a toast
    }
  }

  return (
    <MeScreen>
      <SectionLabel>{t('account.yourHome')}</SectionLabel>
      <ListGroup>
        <Row icon={icons.doc} title={t('account.visits')} sub={t('account.visitsSub')} onPress={() => router.push('/visits')} />
        <Row icon={icons.card} tone="leaf" title={t('account.invoices')} sub={t('account.invoicesSub')} onPress={() => router.push('/invoices')} />
        <Row icon={icons.pin} title={t('account.places')} sub={t('account.placesSub')} onPress={() => router.push('/places')} />
        <Row icon={icons.box} title={t('account.orders')} onPress={() => router.push('/shop/orders')} />
        <Row icon={icons.megaphone} tone="amber" title={t('account.power')} onPress={() => router.push('/power')} last={!hasPlan} />
        {hasPlan ? <Row icon={icons.heart} tone="leaf" title={t('account.care')} onPress={() => router.push('/care')} /> : null}
        {hasPlan ? <Row icon={icons.shield} tone="amber" title={t('account.protections')} sub={t('account.protectionsSub')} onPress={() => router.push('/protections')} last /> : null}
      </ListGroup>
      {!hasPlan ? (
        <ListGroup>
          <Row icon={icons.seal} title={t('home.joinPlan')} sub={t('account.joinSub')} onPress={() => router.push('/plans')} />
          <Row icon={icons.building} title={t('account.designBuild')} onPress={() => router.push({ pathname: '/enquire', params: { kind: 'design' } })} />
          <Row icon={icons.handshake} title={t('account.partner')} onPress={() => router.push({ pathname: '/enquire', params: { kind: 'partner' } })} last />
        </ListGroup>
      ) : null}
      <SectionLabel>{t('account.privacy')}</SectionLabel>
      <ListGroup>
        <Row icon={icons.download} title={t('account.myData')} sub={t('account.myDataSub')} onPress={download} />
        <Row icon={icons.trash} tone="alert" destructive title={t('account.close')} onPress={() => setClosing(true)} last />
      </ListGroup>
      <ConfirmSheet
        open={closing}
        onClose={() => setClosing(false)}
        title={t('account.closeTitle')}
        message={hasPlan ? t('account.closePlan') : t('account.closeFree')}
        confirm={hasPlan ? t('account.closeAsk') : t('account.closeConfirm')}
        busy={busy}
        onConfirm={close}
      />
    </MeScreen>
  );
}
