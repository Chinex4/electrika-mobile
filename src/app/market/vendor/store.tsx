/** Edit the storefront, upload verification papers, ask for the Verified badge. */
import * as DocumentPicker from 'expo-document-picker';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useMarketConfig } from '@/components/market';
import { StoreForm } from '@/components/market/StoreForm';
import { VendorTabs } from '@/components/market/VendorTabs';
import { Banner, Button, Card, Choices, Failed, icons, ListGroup, Loading, Pill, Row, Screen, SectionLabel, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { day } from '@/lib/format';
import { openPage } from '@/lib/pay';
import { useAction, useResource } from '@/store/hooks';
import type { MyStore } from '@/types/market';

export default function EditStore() {
  const t = useT();
  const config = useMarketConfig();
  const q = useResource<{ store: MyStore | null }>('/market/vendor/');
  const { run, busy } = useAction();
  const [kind, setKind] = useState('');
  const s = q.data?.store;

  const upload = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
    const file = picked.canceled ? null : picked.assets[0];
    if (!file) return;
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
    await run('/market/vendor/documents/', { body: form, success: false, invalidate: ['/market/vendor/'] });
    setKind('');
  };

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: '' }} />
      <Title>{t('mk.storefront')}</Title>
      <VendorTabs here="store" />
      {q.isLoading ? <Loading rows={4} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {s ? (
        <>
          {s.is_owner ? <StoreForm key={s.id} store={s} submitLabel={t('mk.saveStorefront')} onSaved={() => q.refetch()} /> : <Banner tone="info">{t('mk.teamNote')}</Banner>}
          <SectionLabel right={<Pill label={s.status_label} tone={s.verified ? 'leaf' : s.status === 'REJECTED' || s.status === 'SUSPENDED' ? 'alert' : 'amber'} />}>
            {t('mk.verification')}
          </SectionLabel>
          <Text className="text-[13px] text-ink">{t('mk.verificationNote')}</Text>
          {s.status_note ? <Banner tone="amber">{s.status_note}</Banner> : null}
          {s.documents.length ? (
            <ListGroup>
              {s.documents.map((d, i) => (
                <Row key={d.id} title={d.kind_label} sub={day(d.uploaded_at)} icon={icons.doc} last={i === s.documents.length - 1} onPress={() => openPage(d.url)} />
              ))}
            </ListGroup>
          ) : null}
          {s.is_owner ? (
            <Card>
              <Choices label={t('mk.docKind')} options={(config?.document_kinds ?? []).map((k) => ({ key: k.value, label: k.label }))} value={kind} onChange={setKind} />
              <Button title={t('mk.uploadDoc')} variant="secondary" icon={icons.download} busy={busy} disabled={!kind} onPress={upload} />
            </Card>
          ) : null}
          {s.is_owner && (s.status === 'UNVERIFIED' || s.status === 'REJECTED') ? (
            s.plan?.verified_badge ? (
              <Button title={t('mk.askVerified')} icon={icons.seal} busy={busy} onPress={() => run('/market/vendor/verify/', { success: false, invalidate: ['/market/vendor/'] })} />
            ) : (
              <View><Text className="text-[12.5px] text-muted">{t('mk.verifiedUpsell')}</Text></View>
            )
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
